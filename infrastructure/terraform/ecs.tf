# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "incepta-${var.environment}"

  setting {
    name  = "containerInsights"
    value = var.ecs_container_insights ? "enabled" : "disabled"
  }

  tags = {
    Name        = "incepta-${var.environment}-cluster"
    Environment = var.environment
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "incepta-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "incepta-${var.environment}-ecs-execution-role"
    Environment = var.environment
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Web Frontend Task Definition
resource "aws_ecs_task_definition" "web" {
  family                   = "incepta-web-${var.environment}"
  cpu                      = "2048"
  memory                   = "4096"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn      = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = "incepta/web:latest"
      cpu       = 2048
      memory    = 4096
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort     = 80
          protocol     = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/incepta-${var.environment}/web"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "web"
        }
      }
    }
  ])

  tags = {
    Name        = "incepta-${var.environment}-web-task"
    Environment = var.environment
  }
}

# API Service Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "incepta-api-${var.environment}"
  cpu                      = "4096"
  memory                   = "8192"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn      = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "incepta/api:latest"
      cpu       = 4096
      memory    = 8192
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort     = 3000
          protocol     = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/incepta-${var.environment}/api"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  tags = {
    Name        = "incepta-${var.environment}-api-task"
    Environment = var.environment
  }
}

# Scraper Service Task Definition
resource "aws_ecs_task_definition" "scraper" {
  family                   = "incepta-scraper-${var.environment}"
  cpu                      = "2048"
  memory                   = "6144"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn      = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "scraper"
      image     = "incepta/scraper:latest"
      cpu       = 2048
      memory    = 6144
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/incepta-${var.environment}/scraper"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "scraper"
        }
      }
    }
  ])

  tags = {
    Name        = "incepta-${var.environment}-scraper-task"
    Environment = var.environment
  }
}

# Auto Scaling Target for Web Service
resource "aws_appautoscaling_target" "web" {
  max_capacity       = lookup(var.ecs_max_instances, var.environment)
  min_capacity       = lookup(var.ecs_min_instances, var.environment)
  resource_id        = "service/incepta-${var.environment}/web"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU Auto Scaling Policy for Web Service
resource "aws_appautoscaling_policy" "web_cpu" {
  name               = "incepta-${var.environment}-web-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web.resource_id
  scalable_dimension = aws_appautoscaling_target.web.scalable_dimension
  service_namespace  = aws_appautoscaling_target.web.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60.0
    scale_in_cooldown  = 180
    scale_out_cooldown = 180
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs_web" {
  name              = "/ecs/incepta-${var.environment}/web"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = "web"
  }
}

resource "aws_cloudwatch_log_group" "ecs_api" {
  name              = "/ecs/incepta-${var.environment}/api"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = "api"
  }
}

resource "aws_cloudwatch_log_group" "ecs_scraper" {
  name              = "/ecs/incepta-${var.environment}/scraper"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = "scraper"
  }
}

# Outputs
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_task_execution_role_arn" {
  description = "The ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}