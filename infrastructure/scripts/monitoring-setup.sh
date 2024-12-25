#!/bin/bash

# Incepta Platform Monitoring Setup Script
# Version: 1.0.0
# Description: Automated setup of comprehensive monitoring infrastructure
# Dependencies: kubectl, helm, aws-cli, openssl, jq

set -euo pipefail

# Global Variables
readonly PROMETHEUS_VERSION="2.45.0"
readonly GRAFANA_VERSION="10.0.3"
readonly ELASTICSEARCH_VERSION="8.9.0"
readonly KIBANA_VERSION="8.9.0"
readonly JAEGER_VERSION="1.47.0"
readonly RETENTION_DAYS=30
readonly BACKUP_RETENTION=7
readonly HA_REPLICAS=3
readonly ALERT_THRESHOLD_CPU=80
readonly ALERT_THRESHOLD_MEMORY=85
readonly ALERT_THRESHOLD_LATENCY=2000

# Logging Configuration
LOG_FILE="/var/log/incepta/monitoring-setup.log"
CORRELATION_ID=$(uuidgen)

# Logging function with structured output
log() {
    local level=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "{
        \"timestamp\": \"$timestamp\",
        \"level\": \"$level\",
        \"correlation_id\": \"$CORRELATION_ID\",
        \"message\": \"$message\"
    }" | tee -a "$LOG_FILE"
}

# Validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating prerequisites..."
    
    local required_tools=("kubectl" "helm" "aws" "openssl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool not found: $tool"
            exit 2
        fi
    done
    
    # Validate Kubernetes context
    if ! kubectl config current-context &> /dev/null; then
        log "ERROR" "No active Kubernetes context found"
        exit 2
    }
    
    log "INFO" "Prerequisites validation completed"
}

# Setup Prometheus with high availability
setup_prometheus() {
    local namespace=$1
    local storage_class=$2
    
    log "INFO" "Setting up Prometheus in namespace: $namespace"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Add and update Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Generate Prometheus values
    cat > prometheus-values.yaml <<EOF
prometheus:
  version: "${PROMETHEUS_VERSION}"
  replicaCount: ${HA_REPLICAS}
  retention: "${RETENTION_DAYS}d"
  
  persistentVolume:
    storageClass: "${storage_class}"
    size: 100Gi
    
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    
  serviceMonitor:
    enabled: true
    
  alertmanager:
    enabled: true
    replicaCount: ${HA_REPLICAS}
    
  resources:
    limits:
      cpu: 1000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi
      
  config:
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      
    rule_files:
      - /etc/prometheus/rules/*.yml
      
    alerting:
      alertmanagers:
        - static_configs:
            - targets:
                - alertmanager:9093
                
  nodeSelector:
    monitoring: "true"
EOF
    
    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace "$namespace" \
        --values prometheus-values.yaml \
        --version "${PROMETHEUS_VERSION}" \
        --wait
        
    log "INFO" "Prometheus setup completed"
}

# Setup Grafana with SSO and automated dashboards
setup_grafana() {
    local namespace=$1
    local admin_password=$2
    
    log "INFO" "Setting up Grafana in namespace: $namespace"
    
    # Add and update Helm repositories
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Generate Grafana values
    cat > grafana-values.yaml <<EOF
grafana:
  version: "${GRAFANA_VERSION}"
  replicaCount: ${HA_REPLICAS}
  
  persistence:
    enabled: true
    size: 10Gi
    
  admin:
    existingSecret: grafana-admin-credentials
    userKey: admin-user
    passwordKey: admin-password
    
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Prometheus
          type: prometheus
          url: http://prometheus-server:9090
          isDefault: true
          
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'default'
          orgId: 1
          folder: ''
          type: file
          disableDeletion: true
          editable: false
          options:
            path: /var/lib/grafana/dashboards
            
  dashboards:
    default:
      api-performance:
        file: dashboards/api-performance.json
      system-metrics:
        file: dashboards/system-metrics.json
      application-metrics:
        file: dashboards/application-metrics.json
        
  resources:
    limits:
      cpu: 500m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 512Mi
      
  securityContext:
    runAsNonRoot: true
    runAsUser: 472
EOF
    
    # Create admin credentials secret
    kubectl create secret generic grafana-admin-credentials \
        --namespace "$namespace" \
        --from-literal=admin-user=admin \
        --from-literal=admin-password="$admin_password" \
        --dry-run=client -o yaml | kubectl apply -f -
        
    # Install Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace "$namespace" \
        --values grafana-values.yaml \
        --version "${GRAFANA_VERSION}" \
        --wait
        
    log "INFO" "Grafana setup completed"
}

# Setup ELK Stack for log aggregation
setup_elk_stack() {
    local namespace=$1
    local storage_class=$2
    
    log "INFO" "Setting up ELK Stack in namespace: $namespace"
    
    # Add and update Helm repositories
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    # Generate Elasticsearch values
    cat > elasticsearch-values.yaml <<EOF
elasticsearch:
  version: "${ELASTICSEARCH_VERSION}"
  replicas: ${HA_REPLICAS}
  
  volumeClaimTemplate:
    storageClassName: "${storage_class}"
    resources:
      requests:
        storage: 100Gi
        
  resources:
    limits:
      cpu: 2000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 2Gi
      
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    
  xpack:
    security:
      enabled: true
      
  nodeSelector:
    monitoring: "true"
EOF
    
    # Install Elasticsearch
    helm upgrade --install elasticsearch elastic/elasticsearch \
        --namespace "$namespace" \
        --values elasticsearch-values.yaml \
        --version "${ELASTICSEARCH_VERSION}" \
        --wait
        
    # Setup CloudWatch Log Groups integration
    aws_region=$(aws configure get region)
    log_group_name="/aws/incepta/${namespace}/application"
    
    # Create CloudWatch Log Group if it doesn't exist
    aws logs create-log-group --log-group-name "$log_group_name" --region "$aws_region" || true
    
    log "INFO" "ELK Stack setup completed"
}

# Setup Jaeger for distributed tracing
setup_jaeger() {
    local namespace=$1
    
    log "INFO" "Setting up Jaeger in namespace: $namespace"
    
    # Add and update Helm repositories
    helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
    helm repo update
    
    # Generate Jaeger values
    cat > jaeger-values.yaml <<EOF
jaeger:
  version: "${JAEGER_VERSION}"
  
  collector:
    replicaCount: ${HA_REPLICAS}
    
  query:
    replicaCount: ${HA_REPLICAS}
    
  agent:
    enabled: true
    
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch-master:9200
        
  resources:
    limits:
      cpu: 500m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 512Mi
      
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
EOF
    
    # Install Jaeger
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace "$namespace" \
        --values jaeger-values.yaml \
        --version "${JAEGER_VERSION}" \
        --wait
        
    log "INFO" "Jaeger setup completed"
}

# Main execution
main() {
    local namespace="monitoring"
    local storage_class="gp2"
    local grafana_admin_password=$(openssl rand -base64 32)
    
    # Create monitoring directory
    mkdir -p /var/log/incepta
    
    # Validate prerequisites
    validate_prerequisites
    
    # Setup monitoring components
    setup_prometheus "$namespace" "$storage_class"
    setup_grafana "$namespace" "$grafana_admin_password"
    setup_elk_stack "$namespace" "$storage_class"
    setup_jaeger "$namespace"
    
    # Export monitoring endpoints
    cat > monitoring-endpoints.json <<EOF
{
    "prometheus_url": "http://prometheus-server.${namespace}:9090",
    "grafana_url": "http://grafana.${namespace}:3000",
    "kibana_url": "http://kibana.${namespace}:5601",
    "jaeger_url": "http://jaeger-query.${namespace}:16686"
}
EOF
    
    log "INFO" "Monitoring setup completed successfully"
    log "INFO" "Grafana admin password: $grafana_admin_password"
}

# Error handling
trap 'log "ERROR" "Script failed on line $LINENO"' ERR

# Execute main function
main "$@"