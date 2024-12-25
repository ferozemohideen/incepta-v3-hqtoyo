# AWS ElastiCache Redis Configuration for Incepta Platform
# Required version: Redis 7.0+
# Provider version: ~> 5.0

# SNS Topic for Redis notifications
resource "aws_sns_topic" "redis_notifications" {
  name = "incepta-${var.environment}-redis-notifications"
  
  tags = {
    Name        = "incepta-${var.environment}-redis-notifications"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name = "incepta-${var.environment}-redis-auth"
  
  tags = {
    Name        = "incepta-${var.environment}-redis-auth"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = random_password.redis_auth.result
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "redis" {
  name        = "incepta-${var.environment}-redis-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for Incepta Redis cluster with multi-AZ support"

  tags = {
    Name        = "incepta-${var.environment}-redis-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ElastiCache parameter group with optimized settings
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis7.0"
  name        = "incepta-${var.environment}-redis-params"
  description = "Optimized parameters for Incepta Redis cluster"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  # Event notification
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  # Connection management
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "maxclients"
    value = "65000"
  }

  # Memory defragmentation
  parameter {
    name  = "active-defrag-threshold-lower"
    value = "10"
  }

  parameter {
    name  = "active-defrag-threshold-upper"
    value = "100"
  }

  tags = {
    Name        = "incepta-${var.environment}-redis-params"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "incepta-${var.environment}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis access from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "incepta-${var.environment}-redis-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "redis-security"
  }
}

# Redis replication group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "incepta-${var.environment}-redis"
  description         = "Production Redis cluster for Incepta platform"
  
  # Node configuration
  node_type                  = var.elasticache_node_type
  num_cache_clusters         = length(var.availability_zones)
  port                      = 6379
  
  # Engine configuration
  engine                     = "redis"
  engine_version            = "7.0"
  parameter_group_name      = aws_elasticache_parameter_group.redis.name
  
  # Network configuration
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.redis.id]
  
  # High availability settings
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Security settings
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = aws_secretsmanager_secret_version.redis_auth.secret_string
  
  # Maintenance settings
  maintenance_window        = "sun:05:00-sun:09:00"
  snapshot_window          = "00:00-04:00"
  snapshot_retention_limit = 7
  auto_minor_version_upgrade = true
  apply_immediately        = false
  
  # Monitoring
  notification_topic_arn    = aws_sns_topic.redis_notifications.arn

  tags = {
    Name          = "incepta-${var.environment}-redis"
    Environment   = var.environment
    ManagedBy     = "terraform"
    Backup        = "required"
    SecurityLevel = "high"
  }
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "incepta-${var.environment}-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_description  = "Redis cluster CPU utilization"
  alarm_actions      = [aws_sns_topic.redis_notifications.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
}

# Outputs for application configuration
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}