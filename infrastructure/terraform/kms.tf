# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get current AWS account ID for key policies
data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  kms_key_prefix = "alias/incepta"
  
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "incepta"
    CostCenter  = "security"
  }
}

# Base KMS key policy allowing root and current account access
locals {
  base_key_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

# RDS KMS Key
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS database encryption in ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                 = local.base_key_policy
  
  tags = merge(local.common_tags, {
    Service = "RDS"
    Name    = "incepta-rds-key-${var.environment}"
  })
}

resource "aws_kms_alias" "rds" {
  name          = "${local.kms_key_prefix}/rds-${var.environment}"
  target_key_id = aws_kms_key.rds.key_id
}

# ElastiCache KMS Key
resource "aws_kms_key" "elasticache" {
  description             = "KMS key for ElastiCache encryption in ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                 = local.base_key_policy
  
  tags = merge(local.common_tags, {
    Service = "ElastiCache"
    Name    = "incepta-elasticache-key-${var.environment}"
  })
}

resource "aws_kms_alias" "elasticache" {
  name          = "${local.kms_key_prefix}/elasticache-${var.environment}"
  target_key_id = aws_kms_key.elasticache.key_id
}

# S3 KMS Key
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption in ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                 = local.base_key_policy
  
  tags = merge(local.common_tags, {
    Service = "S3"
    Name    = "incepta-s3-key-${var.environment}"
  })
}

resource "aws_kms_alias" "s3" {
  name          = "${local.kms_key_prefix}/s3-${var.environment}"
  target_key_id = aws_kms_key.s3.key_id
}

# Application-level KMS Key
resource "aws_kms_key" "app" {
  description             = "KMS key for application-level encryption in ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                 = local.base_key_policy
  
  tags = merge(local.common_tags, {
    Service = "Application"
    Name    = "incepta-app-key-${var.environment}"
  })
}

resource "aws_kms_alias" "app" {
  name          = "${local.kms_key_prefix}/app-${var.environment}"
  target_key_id = aws_kms_key.app.key_id
}

# CloudWatch monitoring for KMS keys
resource "aws_cloudwatch_metric_alarm" "kms_key_usage" {
  for_each = {
    rds         = aws_kms_key.rds.id
    elasticache = aws_kms_key.elasticache.id
    s3          = aws_kms_key.s3.id
    app         = aws_kms_key.app.id
  }

  alarm_name          = "kms-key-usage-${each.key}-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "KeyUsage"
  namespace           = "AWS/KMS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "Monitor KMS key usage for ${each.key} service"
  
  dimensions = {
    KeyId = each.value
  }

  tags = merge(local.common_tags, {
    Service = "Monitoring"
    Name    = "incepta-kms-monitoring-${each.key}-${var.environment}"
  })
}

# Outputs for use in other modules
output "rds_kms_key" {
  value = {
    key_id = aws_kms_key.rds.key_id
    arn    = aws_kms_key.rds.arn
  }
  description = "RDS KMS key details"
}

output "elasticache_kms_key" {
  value = {
    key_id = aws_kms_key.elasticache.key_id
    arn    = aws_kms_key.elasticache.arn
  }
  description = "ElastiCache KMS key details"
}

output "s3_kms_key" {
  value = {
    key_id = aws_kms_key.s3.key_id
    arn    = aws_kms_key.s3.arn
  }
  description = "S3 KMS key details"
}

output "app_kms_key" {
  value = {
    key_id = aws_kms_key.app.key_id
    arn    = aws_kms_key.app.arn
  }
  description = "Application KMS key details"
}