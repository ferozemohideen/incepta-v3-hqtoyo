# Terraform configuration for Incepta Platform
# AWS Provider version ~> 4.0
# Terraform version >= 1.0.0

# Backend configuration for state management
terraform {
  backend "s3" {
    bucket         = "incepta-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "incepta-terraform-locks"
    kms_key_id     = "alias/terraform-bucket-key"
  }
}

# Random string for unique resource naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# KMS key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for Incepta ${var.environment} environment"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-kms"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "incepta-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = var.ecs_container_insights ? "enabled" : "disabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.main.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name    = "/aws/ecs/incepta-${var.environment}"
      }
    }
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-ecs"
  }
}

# RDS Aurora Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier     = "incepta-${var.environment}-aurora"
  engine                = "aurora-postgresql"
  engine_version        = "13.7"
  database_name         = "incepta"
  master_username       = "incepta_admin"
  master_password       = random_password.db_password.result
  backup_retention_period = var.backup_retention_period
  preferred_backup_window = "03:00-04:00"
  storage_encrypted       = true
  kms_key_id             = aws_kms_key.main.arn

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  enabled_cloudwatch_logs_exports = ["postgresql"]

  scaling_configuration {
    auto_pause               = var.environment != "production"
    max_capacity            = var.environment == "production" ? 256 : 64
    min_capacity            = var.environment == "production" ? 32 : 2
    seconds_until_auto_pause = var.environment == "production" ? 0 : 300
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-aurora"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "incepta-${var.environment}-redis"
  engine              = "redis"
  node_type           = var.elasticache_node_type
  num_cache_nodes     = var.environment == "production" ? 3 : 1
  parameter_group_name = "default.redis6.x"
  port                = 6379
  security_group_ids  = [aws_security_group.redis.id]
  subnet_group_name   = aws_elasticache_subnet_group.main.name

  snapshot_retention_limit = var.backup_retention_period
  snapshot_window         = "04:00-05:00"

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-redis"
  }
}

# OpenSearch Domain
resource "aws_opensearch_domain" "main" {
  domain_name    = "incepta-${var.environment}-search"
  engine_version = "OpenSearch_1.3"

  cluster_config {
    instance_type            = var.elasticsearch_instance_type
    instance_count          = var.environment == "production" ? 3 : 1
    zone_awareness_enabled  = var.environment == "production"
    dedicated_master_enabled = var.environment == "production"
  }

  ebs_options {
    ebs_enabled = true
    volume_size = var.environment == "production" ? 100 : 20
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.main.arn
  }

  vpc_options {
    subnet_ids         = [aws_subnet.private[0].id]
    security_group_ids = [aws_security_group.elasticsearch.id]
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-search"
  }
}

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  count       = var.enable_waf ? 1 : 0
  name        = "incepta-${var.environment}-waf"
  description = "WAF rules for Incepta ${var.environment}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-waf"
  }
}

# Route53 and ACM
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-zone"
  }
}

resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["*.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-cert"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/aws/ecs/incepta-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-ecs-logs"
  }
}

# Security Groups
resource "aws_security_group" "rds" {
  name        = "incepta-${var.environment}-rds-sg"
  description = "Security group for RDS Aurora cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "incepta-${var.environment}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    Environment = var.environment
    Name        = "incepta-${var.environment}-redis-sg"
  }
}

# Outputs
output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "rds_endpoint" {
  description = "Endpoint of the RDS cluster"
  value       = aws_rds_cluster.main.endpoint
}

output "redis_endpoint" {
  description = "Endpoint of the Redis cluster"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "opensearch_endpoint" {
  description = "Endpoint of the OpenSearch domain"
  value       = aws_opensearch_domain.main.endpoint
}