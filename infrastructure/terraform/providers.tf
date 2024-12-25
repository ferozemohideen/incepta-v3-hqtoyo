# Required Terraform and provider versions
terraform {
  required_version = ">=1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Primary AWS Provider Configuration (us-east-1)
provider "aws" {
  region = var.aws_region

  # Enhanced retry configuration for API stability
  retry_mode = "adaptive"
  max_retries = 10

  # Default tags applied to all resources
  default_tags {
    tags = {
      Project     = "Incepta"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = var.aws_region
    }
  }

  # Security and endpoint configuration
  assume_role {
    role_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole"
    session_name = "TerraformDeployment-${var.environment}"
    external_id  = "Incepta-${var.environment}"
  }

  # HTTP client configuration
  http_proxy               = null
  https_proxy             = null
  no_proxy                = null
  skip_metadata_api_check = false
  
  # S3 and DynamoDB endpoint configuration for enhanced security
  endpoints {
    s3       = "s3.${var.aws_region}.amazonaws.com"
    dynamodb = "dynamodb.${var.aws_region}.amazonaws.com"
  }
}

# Secondary Region Provider (us-west-2) for high availability
provider "aws" {
  alias  = "secondary"
  region = "us-west-2"

  # Inherit default tags with region override
  default_tags {
    tags = {
      Project     = "Incepta"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = "us-west-2"
      Role        = "Secondary"
    }
  }

  # Security configuration
  assume_role {
    role_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole"
    session_name = "TerraformDeployment-${var.environment}-Secondary"
    external_id  = "Incepta-${var.environment}-Secondary"
  }

  # Retry configuration for cross-region operations
  retry_mode = "adaptive"
  max_retries = 15
}

# Disaster Recovery Region Provider (eu-west-1)
provider "aws" {
  alias  = "dr"
  region = "eu-west-1"

  # Default tags for DR region
  default_tags {
    tags = {
      Project     = "Incepta"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = "eu-west-1"
      Role        = "DR"
    }
  }

  # Security configuration for DR region
  assume_role {
    role_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole-DR"
    session_name = "TerraformDeployment-${var.environment}-DR"
    external_id  = "Incepta-${var.environment}-DR"
  }

  # Enhanced retry configuration for DR operations
  retry_mode = "adaptive"
  max_retries = 20
}

# Random provider for generating unique identifiers
provider "random" {}

# Data source for current AWS account information
data "aws_caller_identity" "current" {}