# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for CloudFront configuration
locals {
  cdn_name = "incepta-${var.environment}-cdn"
  origin_id = "S3-${aws_s3_bucket.document_storage.id}"
  backup_origin_id = "S3-BACKUP-${aws_s3_bucket.backup_storage.id}"
  
  common_tags = {
    Name        = local.cdn_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "cloudfront"
    Project     = "incepta"
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${local.cdn_name}"
}

# Custom cache policy for optimized content delivery
resource "aws_cloudfront_cache_policy" "main" {
  name        = "${local.cdn_name}-cache-policy"
  comment     = "Cache policy for ${local.cdn_name}"
  min_ttl     = 0
  default_ttl = 3600
  max_ttl     = 86400

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
      }
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# URL normalizer function for request handling
resource "aws_cloudfront_function" "url_normalizer" {
  name    = "${local.cdn_name}-url-normalizer"
  runtime = "cloudfront-js-1.0"
  comment = "Normalize URLs for SPA routing"
  
  code = <<-EOT
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      
      // Handle SPA routes by returning index.html for non-asset requests
      if (!uri.includes(".")) {
        request.uri = "/index.html";
      }
      
      return request;
    }
  EOT
}

# Main CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = local.cdn_name
  price_class        = "PriceClass_100"
  aliases            = [var.domain_name, "*.${var.domain_name}"]
  default_root_object = "index.html"
  
  # Origin failover configuration
  origin_group {
    origin_id = local.origin_id
    
    failover_criteria {
      status_codes = [500, 502, 503, 504]
    }
    
    member {
      origin_id = local.origin_id
    }
    
    member {
      origin_id = local.backup_origin_id
    }
  }

  # Primary origin configuration
  origin {
    domain_name = aws_s3_bucket.document_storage.bucket_regional_domain_name
    origin_id   = local.origin_id
    
    origin_shield {
      enabled              = true
      origin_shield_region = var.aws_region
    }
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # Backup origin configuration
  origin {
    domain_name = aws_s3_bucket.backup_storage.bucket_regional_domain_name
    origin_id   = local.backup_origin_id
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id
    
    cache_policy_id          = aws_cloudfront_cache_policy.main.id
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
    
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_normalizer.arn
    }
  }

  # Custom error responses for SPA
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # WAF association
  web_acl_id = aws_wafv2_web_acl.main.arn

  # Access logging configuration
  logging_config {
    bucket          = aws_s3_bucket.access_logs.bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = true
  }

  # Geo-restriction configuration
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = local.common_tags
}

# Outputs
output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "The hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}