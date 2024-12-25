# VPC and Network Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
  
  # Add validation to ensure VPC ID format
  validation {
    condition     = can(regex("^vpc-[a-z0-9]{17}$", module.vpc.vpc_id))
    error_message = "VPC ID must be in the format vpc-xxxxxxxxxxxxx."
  }
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for application tier"
  value       = module.vpc.private_subnet_ids
  
  # Validate that we have at least 2 private subnets for HA
  validation {
    condition     = length(module.vpc.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets are required for high availability."
  }
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancers"
  value       = module.vpc.public_subnet_ids
  
  # Validate that we have at least 2 public subnets for HA
  validation {
    condition     = length(module.vpc.public_subnet_ids) >= 2
    error_message = "At least 2 public subnets are required for high availability."
  }
}

# Database Outputs
output "rds_cluster_endpoint" {
  description = "The cluster endpoint for the RDS Aurora cluster"
  value       = module.rds.rds_cluster_endpoint
  sensitive   = true # Mark as sensitive to prevent exposure in logs
}

output "rds_cluster_reader_endpoint" {
  description = "The reader endpoint for the RDS Aurora cluster"
  value       = module.rds.rds_cluster_reader_endpoint
  sensitive   = true
}

output "rds_security_group_id" {
  description = "The security group ID for RDS cluster"
  value       = module.rds.rds_security_group_id
  
  # Validate security group ID format
  validation {
    condition     = can(regex("^sg-[a-z0-9]{17}$", module.rds.rds_security_group_id))
    error_message = "Security group ID must be in the format sg-xxxxxxxxxxxxx."
  }
}

output "rds_cluster_arn" {
  description = "The ARN of the RDS cluster"
  value       = module.rds.rds_cluster_arn
  
  # Validate ARN format
  validation {
    condition     = can(regex("^arn:aws:rds:[a-z0-9-]+:[0-9]{12}:cluster:.*", module.rds.rds_cluster_arn))
    error_message = "Invalid RDS cluster ARN format."
  }
}

# Environment Information
output "environment_name" {
  description = "The name of the current environment (development, staging, production)"
  value       = var.environment
  
  # Validate environment name
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

output "aws_region" {
  description = "The AWS region where resources are deployed"
  value       = var.aws_region
  
  # Validate AWS region format
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]{1}$", var.aws_region))
    error_message = "AWS region must be in format: xx-xxxx-#."
  }
}

# Monitoring and Logging Outputs
output "vpc_flow_log_group" {
  description = "The CloudWatch Log Group name for VPC flow logs"
  value       = "/aws/vpc/flow-logs/${var.environment}"
}

output "rds_log_group" {
  description = "The CloudWatch Log Group name for RDS logs"
  value       = "/aws/rds/cluster/incepta-${var.environment}"
}

# Network Configuration
output "nat_gateway_ips" {
  description = "Map of NAT Gateway IPs per availability zone"
  value = {
    for idx, az in var.availability_zones :
    az => module.vpc.nat_gateway_ids[idx]
  }
}

# Tags Output
output "resource_tags" {
  description = "Common tags applied to all resources"
  value = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = "Incepta"
      ManagedBy   = "Terraform"
    }
  )
}