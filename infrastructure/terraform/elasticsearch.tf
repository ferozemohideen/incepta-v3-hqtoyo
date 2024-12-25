# AWS OpenSearch (Elasticsearch) Domain Configuration
# Provider version: ~> 5.0

# CloudWatch Log Group for OpenSearch logs
resource "aws_cloudwatch_log_group" "elasticsearch" {
  name              = "/aws/opensearch/incepta-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "incepta-${var.environment}-elasticsearch-logs"
    Environment = var.environment
    Terraform   = "true"
  }
}

# Security Group for OpenSearch domain
resource "aws_security_group" "elasticsearch" {
  name        = "incepta-${var.environment}-elasticsearch-sg"
  description = "Security group for OpenSearch domain"
  vpc_id      = var.vpc_id

  # HTTPS ingress from VPC CIDR
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "HTTPS access from VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "incepta-${var.environment}-elasticsearch-sg"
    Environment = var.environment
    Terraform   = "true"
  }
}

# OpenSearch Domain
resource "aws_opensearch_domain" "main" {
  domain_name    = "incepta-${var.environment}"
  engine_version = "OpenSearch_2.7"

  # Cluster configuration
  cluster_config {
    instance_type            = var.elasticsearch_instance_type
    instance_count          = 3
    zone_awareness_enabled  = true
    zone_awareness_config {
      availability_zone_count = length(var.availability_zones)
    }
    
    # Dedicated master nodes for improved cluster stability
    dedicated_master_enabled = true
    dedicated_master_count   = 3
    dedicated_master_type    = var.elasticsearch_instance_type
  }

  # VPC configuration
  vpc_options {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.elasticsearch.id]
  }

  # EBS storage configuration
  ebs_options {
    ebs_enabled = true
    volume_size = 100
    volume_type = "gp3"
    iops        = 3000
  }

  # Encryption configuration
  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # Advanced options
  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
    "indices.fielddata.cache.size"           = "40"
    "indices.query.bool.max_clause_count"    = "1024"
  }

  # Automated snapshot configuration
  snapshot_options {
    automated_snapshot_start_hour = 23
  }

  # Log publishing configuration
  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.elasticsearch.arn
    log_type                 = "INDEX_SLOW_LOGS"
    enabled                  = true
  }

  tags = {
    Name        = "incepta-${var.environment}-opensearch"
    Environment = var.environment
    Terraform   = "true"
  }

  depends_on = [aws_cloudwatch_log_group.elasticsearch]
}

# Outputs
output "elasticsearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.main.endpoint
}

output "elasticsearch_domain_name" {
  description = "OpenSearch domain name"
  value       = aws_opensearch_domain.main.domain_name
}

output "elasticsearch_security_group_id" {
  description = "Security group ID for OpenSearch domain"
  value       = aws_security_group.elasticsearch.id
}