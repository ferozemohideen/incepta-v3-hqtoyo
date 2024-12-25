# Environment Configuration
# Production environment identifier for the Incepta platform
environment = "production"

# Region Configuration
# Primary AWS region for production deployment with high availability
aws_region = "us-east-1"

# Network Configuration
# Production VPC CIDR with sufficient address space for scalability
vpc_cidr = "10.0.0.0/16"

# High Availability Configuration
# Three availability zones for maximum redundancy and fault tolerance
availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c"
]

# Database Configuration
# Production-grade RDS instance with high memory and CPU for optimal performance
rds_instance_class = "db.r6g.2xlarge"

# Cache Configuration
# High-performance ElastiCache nodes for fast data retrieval
elasticache_node_type = "cache.r6g.xlarge"

# Search Configuration
# Memory-optimized OpenSearch instances for efficient search operations
elasticsearch_instance_type = "r6g.2xlarge"

# Monitoring Configuration
# Enable detailed container monitoring for production environment
ecs_container_insights = true

# Domain Configuration
# Production domain for the Incepta platform
domain_name = "incepta.com"

# Security Configuration
# Enable WAF protection for production security
enable_waf = true

# Resource Tags
# Production environment tags for resource management
tags = {
  Project     = "Incepta"
  ManagedBy   = "Terraform"
  Environment = "production"
  CostCenter  = "PROD-001"
}

# Backup Configuration
# Extended backup retention for production data protection
backup_retention_period = 30

# Auto Scaling Configuration
# Production-grade scaling limits for high availability
ecs_min_instances = {
  web_service     = 3
  api_service     = 3
  scraper_service = 2
  ml_service      = 2
}

ecs_max_instances = {
  web_service     = 10
  api_service     = 15
  scraper_service = 5
  ml_service      = 3
}

# Encryption Configuration
# Enable encryption for all sensitive data in production
enable_encryption = true

# ECS Task Configuration
# Production-optimized container resources
ecs_task_cpu = {
  web_service     = 1024
  api_service     = 2048
  scraper_service = 2048
  ml_service      = 4096
}

ecs_task_memory = {
  web_service     = 2048
  api_service     = 4096
  scraper_service = 4096
  ml_service      = 8192
}

# RDS Configuration
# Production database settings for high availability
rds_multi_az = true
rds_storage_type = "gp3"
rds_allocated_storage = 1000
rds_max_allocated_storage = 2000

# ElastiCache Configuration
# Production cache settings for optimal performance
elasticache_num_cache_nodes = 3
elasticache_automatic_failover = true
elasticache_engine_version = "7.0"

# OpenSearch Configuration
# Production search cluster settings
opensearch_instance_count = 3
opensearch_dedicated_master_enabled = true
opensearch_dedicated_master_type = "r6g.large"
opensearch_dedicated_master_count = 3

# WAF Configuration
# Production WAF rules and rate limiting
waf_rate_limit = 10000
waf_block_period = 240

# VPC Flow Logs
# Enable detailed network logging for production
enable_vpc_flow_logs = true
vpc_flow_logs_retention = 90