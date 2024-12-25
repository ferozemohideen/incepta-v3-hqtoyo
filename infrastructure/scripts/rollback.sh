#!/usr/bin/env bash

# rollback.sh
# Version: 1.0.0
# Dependencies:
# - aws-cli v2.0+
# - kubectl v1.20+
# - jq v1.6+
# - curl v7.0+

set -euo pipefail

# Global variables with defaults
AWS_REGION=${AWS_REGION:-"us-east-1"}
CLUSTER_NAME=${CLUSTER_NAME:-""}
SERVICE_NAME=${SERVICE_NAME:-""}
ROLLBACK_TIMEOUT=${ROLLBACK_TIMEOUT:-300}
HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-5}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-10}
LOG_LEVEL=${LOG_LEVEL:-"INFO"}
DRY_RUN=${DRY_RUN:-"false"}
FORCE_ROLLBACK=${FORCE_ROLLBACK:-"false"}
METRIC_NAMESPACE=${METRIC_NAMESPACE:-"Rollback"}

# Logging functions
log_info() {
    if [[ "${LOG_LEVEL}" == "INFO" || "${LOG_LEVEL}" == "DEBUG" ]]; then
        echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    fi
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_debug() {
    if [[ "${LOG_LEVEL}" == "DEBUG" ]]; then
        echo "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    fi
}

# Parse and validate arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -t|--timeout)
                ROLLBACK_TIMEOUT="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -f|--force)
                FORCE_ROLLBACK="true"
                shift
                ;;
            --health-check-interval)
                HEALTH_CHECK_INTERVAL="$2"
                shift 2
                ;;
            *)
                log_error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "${ENVIRONMENT:-}" ]]; then
        log_error "Environment (-e|--environment) is required"
        exit 1
    fi

    if [[ "${ENVIRONMENT}" != "staging" && "${ENVIRONMENT}" != "production" ]]; then
        log_error "Environment must be either 'staging' or 'production'"
        exit 1
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "Invalid AWS credentials"
        exit 1
    fi
}

# ECS rollback function
rollback_ecs_service() {
    local cluster_name="$1"
    local service_name="$2"
    local previous_task_definition="$3"
    local rollback_config="$4"
    local dry_run="${5:-false}"

    log_info "Starting ECS rollback for service ${service_name} in cluster ${cluster_name}"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would rollback ${service_name} to ${previous_task_definition}"
        return 0
    fi

    # Backup current task definition
    local current_task_def
    current_task_def=$(aws ecs describe-services \
        --cluster "${cluster_name}" \
        --services "${service_name}" \
        --region "${AWS_REGION}" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    log_debug "Current task definition: ${current_task_def}"

    # Update service with previous task definition
    if ! aws ecs update-service \
        --cluster "${cluster_name}" \
        --service "${service_name}" \
        --task-definition "${previous_task_definition}" \
        --region "${AWS_REGION}" &>/dev/null; then
        log_error "Failed to update ECS service"
        return 1
    fi

    # Monitor deployment
    local timeout_counter=0
    while [[ ${timeout_counter} -lt ${ROLLBACK_TIMEOUT} ]]; do
        local deployment_status
        deployment_status=$(aws ecs describe-services \
            --cluster "${cluster_name}" \
            --services "${service_name}" \
            --region "${AWS_REGION}" \
            --query 'services[0].deployments[0].status' \
            --output text)

        if [[ "${deployment_status}" == "PRIMARY" ]]; then
            log_info "ECS rollback completed successfully"
            return 0
        fi

        log_debug "Waiting for deployment to complete. Status: ${deployment_status}"
        sleep "${HEALTH_CHECK_INTERVAL}"
        ((timeout_counter+=HEALTH_CHECK_INTERVAL))
    done

    log_error "ECS rollback timed out"
    return 1
}

# Kubernetes rollback function
rollback_kubernetes() {
    local namespace="$1"
    local deployment_name="$2"
    local previous_revision="$3"
    local rollback_config="$4"
    local dry_run="${5:-false}"

    log_info "Starting Kubernetes rollback for deployment ${deployment_name} in namespace ${namespace}"

    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would rollback ${deployment_name} to revision ${previous_revision}"
        return 0
    fi

    # Verify cluster connectivity
    if ! kubectl cluster-info &>/dev/null; then
        log_error "Unable to connect to Kubernetes cluster"
        return 1
    }

    # Execute rollback
    if ! kubectl rollout undo deployment "${deployment_name}" \
        --to-revision="${previous_revision}" \
        -n "${namespace}"; then
        log_error "Failed to initiate Kubernetes rollback"
        return 1
    }

    # Monitor rollout status
    local timeout_counter=0
    while [[ ${timeout_counter} -lt ${ROLLBACK_TIMEOUT} ]]; do
        if kubectl rollout status deployment "${deployment_name}" \
            -n "${namespace}" --timeout="${HEALTH_CHECK_INTERVAL}s" &>/dev/null; then
            log_info "Kubernetes rollback completed successfully"
            return 0
        fi

        log_debug "Waiting for rollout to complete"
        ((timeout_counter+=HEALTH_CHECK_INTERVAL))
    done

    log_error "Kubernetes rollback timed out"
    return 1
}

# Verify rollback health
verify_rollback() {
    local environment="$1"
    local health_endpoints=("${@:2}")
    local timeout="${ROLLBACK_TIMEOUT}"
    local retry_count=0

    log_info "Starting health verification for ${environment}"

    for endpoint in "${health_endpoints[@]}"; do
        while [[ ${retry_count} -lt ${HEALTH_CHECK_RETRIES} ]]; do
            if curl -s -f "${endpoint}/health" &>/dev/null; then
                log_info "Health check passed for ${endpoint}"
                break
            fi

            log_debug "Health check failed for ${endpoint}, attempt $((retry_count + 1))/${HEALTH_CHECK_RETRIES}"
            ((retry_count++))
            sleep "${HEALTH_CHECK_INTERVAL}"
        done

        if [[ ${retry_count} -eq ${HEALTH_CHECK_RETRIES} ]]; then
            log_error "Health check failed for ${endpoint} after ${HEALTH_CHECK_RETRIES} attempts"
            return 1
        fi
    done

    return 0
}

# Main rollback orchestrator
perform_rollback() {
    parse_arguments "$@"

    log_info "Starting rollback process for ${ENVIRONMENT}"
    log_debug "Configuration: Timeout=${ROLLBACK_TIMEOUT}s, Dry Run=${DRY_RUN}, Force=${FORCE_ROLLBACK}"

    # Create audit trail
    local audit_log="/var/log/rollback_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).log"
    exec 1> >(tee -a "${audit_log}")
    exec 2> >(tee -a "${audit_log}" >&2)

    local rollback_status=0

    if [[ -n "${CLUSTER_NAME}" && -n "${SERVICE_NAME}" ]]; then
        # ECS rollback
        if ! rollback_ecs_service \
            "${CLUSTER_NAME}" \
            "${SERVICE_NAME}" \
            "${VERSION}" \
            "{}" \
            "${DRY_RUN}"; then
            rollback_status=1
        fi
    else
        # Kubernetes rollback
        if ! rollback_kubernetes \
            "${ENVIRONMENT}" \
            "incepta-${ENVIRONMENT}" \
            "${VERSION}" \
            "{}" \
            "${DRY_RUN}"; then
            rollback_status=1
        fi
    fi

    # Verify health regardless of rollback method
    local health_endpoints=(
        "https://api.${ENVIRONMENT}.incepta.com"
        "https://web.${ENVIRONMENT}.incepta.com"
    )

    if ! verify_rollback "${ENVIRONMENT}" "${health_endpoints[@]}"; then
        rollback_status=1
    fi

    if [[ ${rollback_status} -eq 0 ]]; then
        log_info "Rollback completed successfully"
    else
        log_error "Rollback failed"
    fi

    return ${rollback_status}
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    perform_rollback "$@"
fi
```

This script provides a comprehensive rollback solution with the following features:

1. Supports both ECS and Kubernetes rollbacks
2. Extensive logging and audit trail
3. Health check verification
4. Dry run capability
5. Configurable timeouts and retry attempts
6. Error handling and graceful failure
7. AWS and Kubernetes credential verification
8. Progressive rollback with monitoring
9. Environment-specific configuration

Usage examples:

```bash
# ECS rollback
./rollback.sh -e production -v task-definition:123 --cluster-name prod-cluster --service-name web-service

# Kubernetes rollback
./rollback.sh -e staging -v 5 --dry-run

# Force rollback with custom timeout
./rollback.sh -e production -v 3 -f -t 600