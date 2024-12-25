# AWS Provider version ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for WAF configuration
locals {
  waf_name            = "incepta-${var.environment}-waf"
  rate_limit_threshold = 1000
  block_period_seconds = 3600
  metric_name_prefix   = "InceptaWAF"
  
  common_tags = {
    Name        = local.waf_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "waf"
    Project     = "incepta"
  }
}

# IP Rate Limiting Rule
resource "aws_wafv2_ip_set" "rate_limit" {
  name               = "${local.waf_name}-rate-limit-ips"
  description        = "IP set for rate limiting"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  
  tags = local.common_tags
}

# Main WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name        = local.waf_name
  description = "WAF rules for Incepta platform security"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # IP Rate Limiting Rule
  rule {
    name     = "IPRateLimit"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = local.rate_limit_threshold
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${local.metric_name_prefix}-IPRateLimit"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${local.metric_name_prefix}-SQLi"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${local.metric_name_prefix}-Common"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${local.metric_name_prefix}-BadInputs"
      sampled_requests_enabled  = true
    }
  }

  # Geographic Blocking Rule
  rule {
    name     = "GeoBlockHighRiskCountries"
    priority = 5

    override_action {
      none {}
    }

    statement {
      geo_match_statement {
        country_codes = ["NK", "IR", "CU"] # High-risk countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "${local.metric_name_prefix}-GeoBlock"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${local.metric_name_prefix}-WebACL"
    sampled_requests_enabled  = true
  }

  tags = local.common_tags
}

# WAF Web ACL Association with CloudFront
resource "aws_wafv2_web_acl_association" "cloudfront" {
  resource_arn = aws_cloudfront_distribution.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_kinesis_firehose_delivery_stream.waf_logs.arn]
  resource_arn           = aws_wafv2_web_acl.main.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "DROP"
      condition {
        action_condition {
          action = "ALLOW"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

# CloudWatch Metrics and Alarms
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "${local.waf_name}-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "WAF blocked requests exceeded threshold"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Region = "us-east-1"
  }

  tags = local.common_tags
}

# Outputs
output "waf_web_acl_id" {
  description = "The ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "waf_web_acl_arn" {
  description = "The ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}