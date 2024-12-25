# Terraform AWS Provider version >= 1.0.0 required
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">=4.0.0"
    }
  }
}

# Environment Configuration
variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# AWS Region Configuration
variable "aws_region" {
  description = "Primary AWS region for deployment"
  type        = string
  default     = "us-east-1"
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]{1}$", var.aws_region))
    error_message = "AWS region must be in format: xx-xxxx-#."
  }
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones for multi-AZ deployment"
  type        = list(string)
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified for high availability."
  }
}

# Database Configuration
variable "rds_instance_class" {
  description = "RDS instance type based on environment"
  type        = string
  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.rds_instance_class))
    error_message = "RDS instance class must be a valid instance type (e.g., db.t3.medium)."
  }
}

# Cache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type based on environment"
  type        = string
  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.elasticache_node_type))
    error_message = "ElastiCache node type must be a valid instance type (e.g., cache.t3.medium)."
  }
}

# Search Configuration
variable "elasticsearch_instance_type" {
  description = "OpenSearch instance type based on environment"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9]+\\.[a-z0-9]+$", var.elasticsearch_instance_type))
    error_message = "OpenSearch instance type must be a valid instance type (e.g., t3.medium.elasticsearch)."
  }
}

# Monitoring Configuration
variable "ecs_container_insights" {
  description = "Enable/disable ECS container insights monitoring"
  type        = bool
  default     = true
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for Route53 and ACM certificate"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid fully qualified domain name."
  }
}

# Security Configuration
variable "enable_waf" {
  description = "Enable/disable WAF protection"
  type        = bool
  default     = true
}

# Resource Tags
variable "tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Project     = "Incepta"
    ManagedBy   = "Terraform"
    Environment = null # Will be set based on environment variable
  }
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days."
  }
}

# Auto Scaling Configuration
variable "ecs_min_instances" {
  description = "Minimum number of ECS tasks per service"
  type        = map(number)
  default = {
    development = 1
    staging     = 2
    production  = 3
  }
}

variable "ecs_max_instances" {
  description = "Maximum number of ECS tasks per service"
  type        = map(number)
  default = {
    development = 2
    staging     = 5
    production  = 10
  }
}

# KMS Configuration
variable "enable_encryption" {
  description = "Enable KMS encryption for sensitive data"
  type        = bool
  default     = true
}