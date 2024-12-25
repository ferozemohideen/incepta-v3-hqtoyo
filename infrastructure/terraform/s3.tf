# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Main document storage bucket
resource "aws_s3_bucket" "document_storage" {
  bucket = "${var.environment}-incepta-documents"
  
  # Prevent accidental deletion of bucket
  force_destroy = false

  tags = {
    Name                = "${var.environment}-incepta-documents"
    Environment         = var.environment
    CostCenter         = "technology-transfer"
    DataClassification = "confidential"
    SecurityCompliance = "encrypted"
    ManagedBy         = "terraform"
    Project           = "incepta"
  }
}

# Enable versioning for document storage bucket
resource "aws_s3_bucket_versioning" "document_storage_versioning" {
  bucket = aws_s3_bucket.document_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configure server-side encryption using KMS
resource "aws_s3_bucket_server_side_encryption_configuration" "document_storage_encryption" {
  bucket = aws_s3_bucket.document_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Configure lifecycle rules for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "document_storage_lifecycle" {
  bucket = aws_s3_bucket.document_storage.id

  rule {
    id     = "archive_old_versions"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }

  rule {
    id     = "intelligent_tiering"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "document_storage_public_access_block" {
  bucket = aws_s3_bucket.document_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable access logging
resource "aws_s3_bucket" "access_logs" {
  bucket = "${var.environment}-incepta-logs"
  
  force_destroy = false

  tags = {
    Name        = "${var.environment}-incepta-logs"
    Environment = var.environment
    CostCenter  = "technology-transfer"
    ManagedBy   = "terraform"
    Project     = "incepta"
  }
}

resource "aws_s3_bucket_logging" "document_storage_logging" {
  bucket = aws_s3_bucket.document_storage.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "s3-access-logs/"
}

# Configure CORS for web access
resource "aws_s3_bucket_cors_configuration" "document_storage_cors" {
  bucket = aws_s3_bucket.document_storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["https://*.${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Enable bucket policy
resource "aws_s3_bucket_policy" "document_storage_policy" {
  bucket = aws_s3_bucket.document_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.document_storage.arn,
          "${aws_s3_bucket.document_storage.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# Outputs for use in other modules
output "document_bucket_id" {
  description = "ID of the document storage bucket"
  value       = aws_s3_bucket.document_storage.id
}

output "document_bucket_arn" {
  description = "ARN of the document storage bucket"
  value       = aws_s3_bucket.document_storage.arn
}

output "log_bucket_id" {
  description = "ID of the access logging bucket"
  value       = aws_s3_bucket.access_logs.id
}

output "log_bucket_arn" {
  description = "ARN of the access logging bucket"
  value       = aws_s3_bucket.access_logs.arn
}