# Random password generation for RDS master user
resource "random_password" "rds" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"

  # Ensure password meets RDS requirements
  min_upper   = 1
  min_lower   = 1
  min_numeric = 1
  min_special = 1
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS cluster encryption - ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "incepta-${var.environment}-rds-kms"
    Environment = var.environment
  }
}

# KMS key alias
resource "aws_kms_alias" "rds" {
  name          = "alias/incepta-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# RDS subnet group
resource "aws_db_subnet_group" "main" {
  name        = "incepta-${var.environment}-rds-subnet-group"
  description = "RDS subnet group for Incepta ${var.environment}"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "incepta-${var.environment}-rds-subnet-group"
    Environment = var.environment
  }
}

# RDS monitoring role
resource "aws_iam_role" "rds_monitoring" {
  name = "incepta-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "incepta-${var.environment}-rds-monitoring-role"
    Environment = var.environment
  }
}

# Attach enhanced monitoring policy to role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "incepta-${var.environment}-rds-sg"
  description = "Security group for RDS Aurora cluster"
  vpc_id      = var.vpc_id

  # Allow PostgreSQL traffic from ECS security group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "Allow PostgreSQL traffic from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "incepta-${var.environment}-rds-sg"
    Environment = var.environment
  }
}

# RDS Aurora cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier     = "incepta-${var.environment}"
  engine                = "aurora-postgresql"
  engine_version        = "15.3"
  database_name         = "incepta"
  master_username       = "incepta_admin"
  master_password       = random_password.rds.result
  port                  = 5432
  
  # High availability configuration
  availability_zones      = var.availability_zones
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  # Backup configuration
  backup_retention_period   = 30
  preferred_backup_window   = "03:00-04:00"
  copy_tags_to_snapshot    = true
  deletion_protection      = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "incepta-${var.environment}-final-snapshot"
  
  # Maintenance configuration
  preferred_maintenance_window = "mon:04:00-mon:05:00"
  auto_minor_version_upgrade  = true
  
  # Security configuration
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn
  
  # Monitoring configuration
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  tags = {
    Name        = "incepta-${var.environment}-aurora-cluster"
    Environment = var.environment
  }
}

# RDS Aurora instances
resource "aws_rds_cluster_instance" "main" {
  count = 3 # Primary + 2 replicas

  identifier         = "incepta-${var.environment}-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.rds_instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  
  # Network configuration
  db_subnet_group_name = aws_db_subnet_group.main.name
  publicly_accessible  = false
  
  # Performance configuration
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  
  # Monitoring configuration
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Maintenance configuration
  auto_minor_version_upgrade = true
  
  tags = {
    Name        = "incepta-${var.environment}-aurora-instance-${count.index}"
    Environment = var.environment
  }
}

# Outputs
output "rds_cluster_endpoint" {
  description = "RDS cluster writer endpoint"
  value       = aws_rds_cluster.main.endpoint
}

output "rds_cluster_reader_endpoint" {
  description = "RDS cluster reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "rds_cluster_port" {
  description = "RDS cluster port"
  value       = aws_rds_cluster.main.port
}

output "rds_cluster_database_name" {
  description = "RDS cluster database name"
  value       = aws_rds_cluster.main.database_name
}