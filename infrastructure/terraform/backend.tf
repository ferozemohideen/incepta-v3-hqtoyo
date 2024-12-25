# Backend configuration for Terraform state management
# Required Provider: hashicorp/terraform >= 1.0.0

terraform {
  # Configure S3 backend for state storage with encryption and locking
  backend "s3" {
    # S3 bucket for centralized state storage
    bucket = "incepta-terraform-state"
    
    # Dynamic state file path based on environment
    key = "${var.environment}/terraform.tfstate"
    
    # Primary region for state storage
    region = "us-east-1"
    
    # Enable server-side encryption using KMS
    encrypt = true
    kms_key_id = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    
    # DynamoDB table for state locking
    dynamodb_table = "incepta-terraform-locks"
    
    # Access control and security settings
    acl = "private"
    
    # Enable versioning for state history
    versioning = true
    
    # Server-side encryption configuration
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm = "aws:kms"
        }
      }
    }
    
    # Additional security and performance settings
    force_path_style = false
    skip_credentials_validation = false
    skip_metadata_api_check = false
    skip_region_validation = false
  }

  # Required provider versions
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">=4.0.0"
    }
  }

  # Minimum required Terraform version
  required_version = ">=1.0.0"
}

# Configure workspace-specific settings
terraform {
  workspace_tags = {
    Environment = terraform.workspace
    Project     = "Incepta"
    ManagedBy   = "Terraform"
  }
}

# Local variables for backend configuration
locals {
  common_tags = {
    Project     = "Incepta"
    Environment = var.environment
    ManagedBy   = "Terraform"
    LastUpdated = timestamp()
  }
}