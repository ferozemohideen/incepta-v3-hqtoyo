# Provider configuration with required version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for common configurations
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    UpdatedAt   = timestamp()
  }

  # Service principals with enhanced security
  service_principals = {
    ecs_tasks = "ecs-tasks.amazonaws.com"
    ecs       = "ecs.amazonaws.com"
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name                 = "${var.environment}-${var.project_name}-ecs-execution-role"
  description          = "IAM role for ECS task execution with enhanced security controls"
  max_session_duration = 3600
  path                = "/service-roles/"
  
  # Trust relationship policy with security conditions
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = local.service_principals.ecs_tasks
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    RoleType      = "TaskExecution"
    SecurityLevel = "High"
  })
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name                 = "${var.environment}-${var.project_name}-ecs-task-role"
  description          = "IAM role for ECS tasks runtime with least-privilege permissions"
  max_session_duration = 3600
  path                = "/service-roles/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = local.service_principals.ecs_tasks
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    RoleType      = "TaskRuntime"
    SecurityLevel = "High"
  })
}

# Task Execution Role Policy
resource "aws_iam_role_policy" "ecs_task_execution_policy" {
  name = "${var.environment}-${var.project_name}-ecs-execution-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/${var.environment}-${var.project_name}*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.ecs_key.arn
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}

# Task Role Policy for S3 Access
resource "aws_iam_role_policy" "ecs_task_s3_policy" {
  name = "${var.environment}-${var.project_name}-ecs-s3-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          data.aws_s3_bucket.document_bucket.arn,
          "${data.aws_s3_bucket.document_bucket.arn}/*"
        ]
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

# KMS Key for ECS encryption
resource "aws_kms_key" "ecs_key" {
  description             = "KMS key for ECS service encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ECS Service Use"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_task_role.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Purpose = "ECS-Encryption"
  })
}

# CloudWatch Logs Policy
resource "aws_iam_role_policy" "ecs_cloudwatch_policy" {
  name = "${var.environment}-${var.project_name}-ecs-cloudwatch-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/${var.environment}-${var.project_name}*:*"
        ]
      }
    ]
  })
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Outputs for cross-module reference
output "ecs_task_execution_role" {
  description = "ECS task execution role details"
  value = {
    arn  = aws_iam_role.ecs_task_execution_role.arn
    name = aws_iam_role.ecs_task_execution_role.name
  }
}

output "ecs_task_role" {
  description = "ECS task role details"
  value = {
    arn  = aws_iam_role.ecs_task_role.arn
    name = aws_iam_role.ecs_task_role.name
  }
}

output "kms_key_arn" {
  description = "KMS key ARN for ECS encryption"
  value       = aws_kms_key.ecs_key.arn
}