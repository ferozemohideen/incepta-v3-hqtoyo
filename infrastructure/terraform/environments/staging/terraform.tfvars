# Environment Configuration
environment = "staging"
aws_region = "us-east-1"

# Network Configuration
vpc_cidr = "10.1.0.0/16"
availability_zones = [
  "us-east-1a",
  "us-east-1b"
]

# Database Configuration
rds_instance_class = "db.t3.medium"

# Cache Configuration
elasticache_node_type = "cache.t3.medium"

# Search Configuration
elasticsearch_instance_type = "t3.medium.elasticsearch"

# Monitoring Configuration
ecs_container_insights = true

# Domain Configuration
domain_name = "staging.incepta.com"

# Security Configuration
enable_waf = true

# Resource Tags
tags = {
  Project     = "Incepta"
  ManagedBy   = "Terraform"
  Environment = "staging"
  CostCenter  = "Technology-Staging"
}

# Backup Configuration
backup_retention_period = 7

# Auto Scaling Configuration for Staging (10% of production capacity)
ecs_min_instances = {
  web_service     = 2
  api_service     = 2
  scraper_service = 1
  ml_service      = 1
}

ecs_max_instances = {
  web_service     = 5
  api_service     = 5
  scraper_service = 3
  ml_service      = 2
}

# Encryption Configuration
enable_encryption = true

# Additional Staging-specific configurations
enable_performance_insights = true
multi_az_deployment = true
skip_final_snapshot = false
deletion_protection = true

# Cost optimization settings for staging
performance_insights_retention_period = 7
monitoring_interval = 60
backup_window = "03:00-04:00"
maintenance_window = "Mon:04:00-Mon:05:00"

# WAF Configuration
waf_rule_limits = {
  request_rate = 2000
  ip_rate_limit = 1000
}

# Logging Configuration
cloudwatch_log_retention = 30
enable_audit_logging = true