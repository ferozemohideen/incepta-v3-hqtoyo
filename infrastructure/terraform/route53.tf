# AWS Route 53 Configuration for Incepta Platform
# Provider version: ~> 4.0

# Local variables for DNS configuration
locals {
  dns_name = "incepta-${var.environment}"
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "dns"
  }
}

# Primary hosted zone for the domain
resource "aws_route53_zone" "primary" {
  name          = var.domain_name
  comment       = "Primary DNS zone for ${local.dns_name}"
  force_destroy = false # Prevent accidental deletion

  # Enable DNSSEC signing for enhanced security
  dnssec_config {
    signing_status = "SIGNING"
  }

  tags = merge(local.common_tags, {
    Name = "${local.dns_name}-zone"
  })
}

# Enable query logging for the hosted zone
resource "aws_route53_query_log" "dns_logging" {
  depends_on = [aws_route53_zone.primary]

  cloudwatch_log_group_name = "/aws/route53/${local.dns_name}"
  zone_id                   = aws_route53_zone.primary.zone_id
}

# Health check for the main application endpoint
resource "aws_route53_health_check" "primary" {
  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = merge(local.common_tags, {
    Name = "${local.dns_name}-health-check"
  })
}

# Primary A record for the application (Alias to CloudFront distribution)
resource "aws_route53_record" "primary_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cdn_domain
    zone_id               = aws_route53_zone.primary.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.primary.id

  # Enable latency-based routing
  set_identifier = "primary"
  latency_routing_policy {
    region = var.aws_region
  }
}

# CNAME record for www subdomain
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = "300"
  records = [var.domain_name]
}

# MX records for email routing
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = "3600"

  records = [
    "10 inbound-smtp.${var.aws_region}.amazonaws.com"
  ]
}

# TXT record for domain verification and SPF
resource "aws_route53_record" "txt" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = "3600"

  records = [
    "v=spf1 include:amazonses.com ~all"
  ]
}

# CAA records for SSL/TLS certificate issuance
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "CAA"
  ttl     = "3600"

  records = [
    "0 issue \"amazon.com\"",
    "0 issue \"amazontrust.com\"",
    "0 issuewild \"amazon.com\"",
    "0 issuewild \"amazontrust.com\""
  ]
}

# Outputs for use in other modules
output "zone_id" {
  description = "The hosted zone ID for DNS record management"
  value       = aws_route53_zone.primary.zone_id
}

output "nameservers" {
  description = "The nameservers for the hosted zone"
  value       = aws_route53_zone.primary.name_servers
}

output "domain_validation" {
  description = "The DNS records for domain validation"
  value = {
    name    = var.domain_name
    zone_id = aws_route53_zone.primary.zone_id
    records = aws_route53_zone.primary.name_servers
  }
}