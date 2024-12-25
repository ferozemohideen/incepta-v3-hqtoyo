#!/bin/bash

# SSL/TLS Certificate Renewal Script for Incepta Platform
# Version: 1.0.0
# Dependencies:
# - aws-cli v2.0+
# - certbot v2.0+
# - jq v1.6+

set -euo pipefail

# Global Configuration
CERT_RENEWAL_DAYS=30
LOG_FILE="/var/log/ssl-renew.log"
AWS_REGION="us-east-1"
BACKUP_DIR="/var/backup/ssl"
MAX_RETRIES=3
RETRY_DELAY=60
ALERT_EMAIL="security@incepta.com"

# Logging Configuration
setup_logging() {
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting SSL certificate renewal process"
}

# Error Handler
error_handler() {
    local exit_code=$?
    local line_number=$1
    echo "[ERROR] Failed at line ${line_number} with exit code ${exit_code}"
    
    # Send alert email
    aws ses send-email \
        --from "${ALERT_EMAIL}" \
        --to "${ALERT_EMAIL}" \
        --subject "SSL Renewal Error - Incepta Platform" \
        --text "Certificate renewal failed at line ${line_number} with exit code ${exit_code}. Check logs at ${LOG_FILE}"
        
    exit "${exit_code}"
}
trap 'error_handler ${LINENO}' ERR

# Validate Prerequisites
check_prerequisites() {
    local missing_deps=()
    
    # Check required commands
    for cmd in aws certbot jq; do
        if ! command -v "${cmd}" &> /dev/null; then
            missing_deps+=("${cmd}")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo "[ERROR] Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    # Ensure backup directory exists
    mkdir -p "${BACKUP_DIR}"
}

# Check Certificate Expiry
check_certificate_expiry() {
    local cert_arn=$1
    local domain_name=$2
    
    echo "[INFO] Checking certificate expiry for ${domain_name}"
    
    local cert_details
    cert_details=$(aws acm describe-certificate \
        --certificate-arn "${cert_arn}" \
        --region "${AWS_REGION}")
    
    local expiry_date
    expiry_date=$(echo "${cert_details}" | jq -r '.Certificate.NotAfter')
    
    local current_date
    current_date=$(date +%s)
    local expiry_timestamp
    expiry_timestamp=$(date -d "${expiry_date}" +%s)
    local days_until_expiry
    days_until_expiry=$(( (expiry_timestamp - current_date) / 86400 ))
    
    echo "[INFO] Certificate expires in ${days_until_expiry} days"
    
    if [ "${days_until_expiry}" -le "${CERT_RENEWAL_DAYS}" ]; then
        return 0
    else
        return 1
    fi
}

# Backup Existing Certificate
backup_certificate() {
    local domain_name=$1
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}/${domain_name}_${timestamp}"
    
    echo "[INFO] Backing up existing certificate to ${backup_path}"
    
    mkdir -p "${backup_path}"
    cp -r /etc/letsencrypt/live/"${domain_name}"/* "${backup_path}/"
    
    # Compress backup
    tar -czf "${backup_path}.tar.gz" -C "${BACKUP_DIR}" "${domain_name}_${timestamp}"
    rm -rf "${backup_path}"
    
    echo "[INFO] Certificate backup completed"
}

# Renew Certificate
renew_certificate() {
    local domain_name=$1
    
    echo "[INFO] Starting certificate renewal for ${domain_name}"
    
    # Stop services using ports 80/443
    systemctl stop nginx || true
    
    # Attempt certificate renewal
    certbot renew \
        --non-interactive \
        --agree-tos \
        --email "${ALERT_EMAIL}" \
        --preferred-challenges dns \
        --deploy-hook /usr/local/bin/cert-deploy-hook.sh
    
    # Restart services
    systemctl start nginx
    
    echo "[INFO] Certificate renewal completed"
}

# Update ACM Certificate
update_acm_certificate() {
    local cert_arn=$1
    local domain_name=$2
    local distribution_id=$3
    
    echo "[INFO] Updating ACM certificate for ${domain_name}"
    
    # Import new certificate to ACM
    local new_cert_arn
    new_cert_arn=$(aws acm import-certificate \
        --certificate-arn "${cert_arn}" \
        --certificate file:///etc/letsencrypt/live/"${domain_name}"/cert.pem \
        --private-key file:///etc/letsencrypt/live/"${domain_name}"/privkey.pem \
        --certificate-chain file:///etc/letsencrypt/live/"${domain_name}"/chain.pem \
        --region "${AWS_REGION}" \
        --output text)
    
    echo "[INFO] New certificate imported to ACM: ${new_cert_arn}"
    
    # Update CloudFront distribution
    aws cloudfront update-distribution \
        --id "${distribution_id}" \
        --distribution-config "{\"ViewerCertificate\":{\"ACMCertificateArn\":\"${new_cert_arn}\",\"SSLSupportMethod\":\"sni-only\",\"MinimumProtocolVersion\":\"TLSv1.2_2021\"}}" \
        --region "${AWS_REGION}"
    
    echo "[INFO] CloudFront distribution updated with new certificate"
    
    # Wait for distribution to be deployed
    aws cloudfront wait distribution-deployed \
        --id "${distribution_id}" \
        --region "${AWS_REGION}"
}

# Main Execution
main() {
    local domain_name=$1
    local cert_arn=$2
    local distribution_id=$3
    
    setup_logging
    check_prerequisites
    
    echo "[INFO] Starting certificate renewal process for ${domain_name}"
    
    # Check if renewal is needed
    if check_certificate_expiry "${cert_arn}" "${domain_name}"; then
        # Backup existing certificate
        backup_certificate "${domain_name}"
        
        # Attempt renewal with retries
        local attempt=1
        while [ "${attempt}" -le "${MAX_RETRIES}" ]; do
            echo "[INFO] Renewal attempt ${attempt}/${MAX_RETRIES}"
            
            if renew_certificate "${domain_name}"; then
                update_acm_certificate "${cert_arn}" "${domain_name}" "${distribution_id}"
                echo "[SUCCESS] Certificate renewal completed successfully"
                exit 0
            fi
            
            attempt=$((attempt + 1))
            [ "${attempt}" -le "${MAX_RETRIES}" ] && sleep "${RETRY_DELAY}"
        done
        
        echo "[ERROR] Certificate renewal failed after ${MAX_RETRIES} attempts"
        exit 1
    else
        echo "[INFO] Certificate renewal not required at this time"
        exit 0
    fi
}

# Script execution
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <domain_name> <certificate_arn> <distribution_id>"
    exit 1
fi

main "$@"
```

This script implements a robust SSL/TLS certificate renewal process with the following key features:

1. Comprehensive error handling and logging
2. Certificate expiry checking with configurable threshold
3. Automatic backup of existing certificates
4. Integration with Let's Encrypt for certificate renewal
5. AWS ACM certificate import and CloudFront distribution update
6. Retry mechanism with configurable attempts and delay
7. Email notifications for critical errors
8. Prerequisite validation
9. Secure handling of sensitive certificate files
10. Proper service management during renewal

The script follows best practices for shell scripting:
- Uses strict error checking with `set -euo pipefail`
- Implements proper logging and error handling
- Includes comprehensive documentation
- Follows security best practices for certificate handling
- Provides clear usage instructions
- Implements proper backup procedures
- Handles service restarts gracefully
- Includes proper AWS service integration

Usage:
```bash
./ssl-renew.sh example.com arn:aws:acm:region:account:certificate/12345 E2QWRTY4XAMPLE