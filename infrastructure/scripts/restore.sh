#!/bin/bash

# PostgreSQL Database Restore Script
# Version: 1.0.0
# Description: Advanced shell script for secure, automated PostgreSQL database restoration 
# from encrypted S3 backups with comprehensive validation, monitoring, and compliance tracking

# Exit on any error
set -e

# Enable error tracing
set -o errtrace

# Global constants from configuration
RESTORE_DIR="/var/restore/postgresql"
MAX_RETRIES=3
BACKUP_RETENTION_DAYS=30
PARALLEL_DOWNLOAD_THRESHOLD="10GB"

# Load configurations from imported files
source <(echo "$(cat ../../src/backend/src/config/database.config.ts)" | grep -o 'DB_[A-Z_]*=[^;]*')
source <(echo "$(cat ../../src/backend/src/config/s3.config.ts)" | grep -o 'AWS_[A-Z_]*=[^;]*')

# Logging configuration
LOG_FILE="${RESTORE_DIR}/restore_$(date +%Y%m%d_%H%M%S).log"
AUDIT_FILE="${RESTORE_DIR}/audit_$(date +%Y%m%d_%H%M%S).json"

# CloudWatch metric namespace
CW_NAMESPACE="Incepta/DatabaseRestore"

# Function to log messages with timestamp
log() {
    local level=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Function to send metrics to CloudWatch
send_metric() {
    local metric_name=$1
    local value=$2
    local unit=$3
    aws cloudwatch put-metric-data \
        --namespace "$CW_NAMESPACE" \
        --metric-name "$metric_name" \
        --value "$value" \
        --unit "$unit" \
        --region "$AWS_S3_REGION"
}

# Function to validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating prerequisites..."
    
    # Check PostgreSQL client version
    if ! command -v pg_restore >/dev/null 2>&1; then
        log "ERROR" "pg_restore not found. Please install postgresql-client"
        exit 1
    fi
    
    # Verify PostgreSQL version compatibility
    PG_VERSION=$(pg_restore --version | grep -oE '[0-9]+\.[0-9]+')
    if [[ $(echo "$PG_VERSION < 15.0" | bc -l) -eq 1 ]]; then
        log "ERROR" "PostgreSQL version must be 15.0 or higher"
        exit 1
    }
    
    # Check AWS CLI installation
    if ! command -v aws >/dev/null 2>&1; then
        log "ERROR" "AWS CLI not found. Please install aws-cli v2"
        exit 1
    }
    
    # Validate AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log "ERROR" "Invalid AWS credentials"
        exit 1
    }
    
    # Check restore directory
    if [[ ! -d "$RESTORE_DIR" ]]; then
        mkdir -p "$RESTORE_DIR"
    fi
    
    # Check directory permissions
    if [[ ! -w "$RESTORE_DIR" ]]; then
        log "ERROR" "Restore directory not writable"
        exit 1
    }
    
    # Check available disk space
    local required_space=$((50 * 1024 * 1024 * 1024)) # 50GB minimum
    local available_space=$(df -B1 "$RESTORE_DIR" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt $required_space ]]; then
        log "ERROR" "Insufficient disk space"
        exit 1
    }
    
    log "INFO" "Prerequisites validation completed successfully"
}

# Function to download backup from S3
download_backup() {
    local backup_name=$1
    local start_time=$(date +%s)
    
    log "INFO" "Starting backup download: $backup_name"
    
    # Create temporary directory for download
    local temp_dir="${RESTORE_DIR}/temp_$(date +%s)"
    mkdir -p "$temp_dir"
    
    # Download backup with progress monitoring
    aws s3 cp \
        "s3://${AWS_S3_BUCKET}/${backup_name}" \
        "${temp_dir}/${backup_name}" \
        --region "$AWS_S3_REGION" \
        --expected-size $(aws s3api head-object --bucket "$AWS_S3_BUCKET" --key "$backup_name" --query 'ContentLength') \
        2>&1 | tee -a "$LOG_FILE"
    
    # Verify download integrity
    local expected_checksum=$(aws s3api head-object --bucket "$AWS_S3_BUCKET" --key "$backup_name" --query 'ETag' --output text)
    local actual_checksum=$(md5sum "${temp_dir}/${backup_name}" | cut -d' ' -f1)
    
    if [[ "$expected_checksum" != "$actual_checksum" ]]; then
        log "ERROR" "Backup integrity check failed"
        rm -rf "$temp_dir"
        exit 1
    }
    
    # Calculate and log download metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(stat -f%z "${temp_dir}/${backup_name}")
    local speed=$((size / duration))
    
    send_metric "DownloadDuration" "$duration" "Seconds"
    send_metric "DownloadSize" "$size" "Bytes"
    send_metric "DownloadSpeed" "$speed" "Bytes/Second"
    
    echo "${temp_dir}/${backup_name}"
}

# Function to restore database
restore_database() {
    local backup_path=$1
    local start_time=$(date +%s)
    
    log "INFO" "Starting database restoration"
    
    # Create restoration checkpoint
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "${RESTORE_DIR}/pre_restore_backup_$(date +%s).dump"
    
    # Stop application services
    log "INFO" "Stopping dependent services..."
    # Add commands to stop your application services here
    
    # Optimize PostgreSQL parameters for restore
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
        ALTER SYSTEM SET maintenance_work_mem = '2GB';
        ALTER SYSTEM SET checkpoint_timeout = '30min';
        SELECT pg_reload_conf();
EOF
    
    # Perform restoration
    pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --jobs=4 \
        "$backup_path" 2>&1 | tee -a "$LOG_FILE"
    
    # Reset PostgreSQL parameters
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
        ALTER SYSTEM RESET maintenance_work_mem;
        ALTER SYSTEM RESET checkpoint_timeout;
        SELECT pg_reload_conf();
EOF
    
    # Verify restoration
    log "INFO" "Verifying database restoration..."
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        log "ERROR" "Database verification failed"
        exit 1
    }
    
    # Calculate and log restore metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    send_metric "RestoreDuration" "$duration" "Seconds"
    
    log "INFO" "Database restoration completed successfully"
}

# Main execution
main() {
    local backup_name=$1
    
    if [[ -z "$backup_name" ]]; then
        log "ERROR" "Backup name not provided"
        exit 1
    }
    
    # Initialize audit log
    echo "{\"start_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$AUDIT_FILE"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Download and restore with retry logic
    local retry_count=0
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if backup_path=$(download_backup "$backup_name"); then
            if restore_database "$backup_path"; then
                break
            fi
        fi
        
        ((retry_count++))
        log "WARN" "Retry $retry_count of $MAX_RETRIES"
        sleep $((2 ** retry_count))
    done
    
    if [[ $retry_count -eq $MAX_RETRIES ]]; then
        log "ERROR" "Maximum retry attempts reached"
        exit 1
    }
    
    # Cleanup
    rm -rf "${RESTORE_DIR}/temp_"*
    find "$RESTORE_DIR" -name "pre_restore_backup_*.dump" -mtime +$BACKUP_RETENTION_DAYS -delete
    
    # Update audit log
    jq --arg end_time "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
       --arg status "success" \
       '. + {end_time: $end_time, status: $status}' \
       "$AUDIT_FILE" > "${AUDIT_FILE}.tmp" && mv "${AUDIT_FILE}.tmp" "$AUDIT_FILE"
    
    log "INFO" "Restore operation completed successfully"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    trap 'log "ERROR" "Script failed on line $LINENO"' ERR
    main "$@"
fi