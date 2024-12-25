# AWS Certificate Manager (ACM) Configuration for Incepta Platform
# Provider version: ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for certificate management
locals {
  cert_name = "incepta-${var.environment}-cert"
  common_tags = {
    Name          = local.cert_name
    Environment   = var.environment
    ManagedBy     = "terraform"
    Service       = "acm"
    SecurityLevel = "critical"
    AutoRenew     = "true"
  }
}

# Primary SSL/TLS certificate for the domain with wildcard support
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}", "www.${var.domain_name}"]
  validation_method         = "DNS"
  tags                     = local.common_tags

  # Enable certificate transparency logging for enhanced security
  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  # Ensure new certificate is created before destroying the old one
  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation records for certificate authentication
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = data.aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Certificate validation configuration with timeout settings
resource "aws_acm_certificate_validation" "main" {
  certificate_arn = aws_acm_certificate.main.arn
  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation : record.fqdn
  ]

  timeouts {
    create = "45m"
  }
}

# Data source for Route53 zone lookup
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# Outputs for use in other modules
output "certificate_arn" {
  description = "ARN of the issued certificate for use in CloudFront and ALB configurations"
  value       = aws_acm_certificate.main.arn
}

output "certificate_validation_id" {
  description = "Certificate validation ID for status tracking"
  value       = aws_acm_certificate_validation.main.id
}

output "domain_validation_options" {
  description = "Domain validation options for external monitoring and automation"
  value       = aws_acm_certificate.main.domain_validation_options
  sensitive   = true
}