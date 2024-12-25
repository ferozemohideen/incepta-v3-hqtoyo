# AWS CloudWatch Configuration for Incepta Platform
# Provider version: hashicorp/aws ~> 5.0

# KMS key for log encryption
resource "aws_kms_key" "cloudwatch" {
  description             = "KMS key for CloudWatch Logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.environment}-cloudwatch-kms"
  })
}

# Log Groups
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/incepta/${var.environment}/application"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-app-logs"
  })
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/incepta/${var.environment}/api"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-api-logs"
  })
}

# Metric Filters for Error Tracking
resource "aws_cloudwatch_log_metric_filter" "error_rate" {
  name           = "${var.environment}-error-rate"
  pattern        = "[timestamp, requestid, level = ERROR, ...]"
  log_group_name = aws_cloudwatch_log_group.api_logs.name

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "Incepta"
    value         = "1"
    default_value = "0"
  }
}

# Dashboard for System Overview
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-incepta-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["Incepta", "APILatency", "Environment", var.environment],
            ["Incepta", "ErrorCount", "Environment", var.environment]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "API Performance"
        }
      }
    ]
  })
}

# Alarms
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.environment}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "APILatency"
  namespace          = "Incepta"
  period             = 60
  statistic          = "Average"
  threshold          = 2000 # 2 seconds max latency
  alarm_description  = "API latency exceeded 2 seconds"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    Environment = var.environment
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-api-latency-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${var.environment}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "ErrorCount"
  namespace          = "Incepta"
  period             = 300
  statistic          = "Sum"
  threshold          = 10
  alarm_description  = "Error rate exceeded threshold"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    Environment = var.environment
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-error-rate-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "uptime" {
  alarm_name          = "${var.environment}-uptime"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name        = "HealthyHostCount"
  namespace          = "AWS/ApplicationELB"
  period             = 60
  statistic          = "Average"
  threshold          = 1
  alarm_description  = "System availability dropped below SLA"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    Environment = var.environment
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-uptime-alarm"
  })
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-cloudwatch-alerts"
  kms_master_key_id = aws_kms_key.cloudwatch.id

  tags = merge(var.tags, {
    Name = "${var.environment}-alerts-topic"
  })
}

# ECS Container Insights
resource "aws_cloudwatch_log_group" "ecs_insights" {
  count             = var.ecs_container_insights ? 1 : 0
  name              = "/aws/ecs/containerinsights/${var.environment}/performance"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-ecs-insights"
  })
}

# RDS Enhanced Monitoring
resource "aws_cloudwatch_log_group" "rds_enhanced_monitoring" {
  name              = "/aws/rds/enhanced/${var.environment}"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-rds-monitoring"
  })
}

# Outputs
output "app_log_group" {
  value = {
    name       = aws_cloudwatch_log_group.app_logs.name
    arn        = aws_cloudwatch_log_group.app_logs.arn
    kms_key_id = aws_cloudwatch_log_group.app_logs.kms_key_id
  }
  description = "Application log group details"
}

output "api_latency_alarm" {
  value = {
    alarm_name    = aws_cloudwatch_metric_alarm.api_latency.alarm_name
    alarm_arn     = aws_cloudwatch_metric_alarm.api_latency.arn
    alarm_actions = aws_cloudwatch_metric_alarm.api_latency.alarm_actions
  }
  description = "API latency alarm details"
}

output "error_rate_alarm" {
  value = {
    alarm_name    = aws_cloudwatch_metric_alarm.error_rate.alarm_name
    alarm_arn     = aws_cloudwatch_metric_alarm.error_rate.arn
    alarm_actions = aws_cloudwatch_metric_alarm.error_rate.alarm_actions
  }
  description = "Error rate alarm details"
}

output "uptime_alarm" {
  value = {
    alarm_name    = aws_cloudwatch_metric_alarm.uptime.alarm_name
    alarm_arn     = aws_cloudwatch_metric_alarm.uptime.arn
    alarm_actions = aws_cloudwatch_metric_alarm.uptime.alarm_actions
  }
  description = "Uptime monitoring alarm details"
}