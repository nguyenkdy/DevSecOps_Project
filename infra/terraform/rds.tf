# Security Group — chỉ cho EKS nodes kết nối vào RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow PostgreSQL from EKS nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    # Allow từ EKS node security group (nodes ở public subnet, RDS ở private subnet, cùng VPC)
    security_groups = [module.eks.node_security_group_id]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]  # Fallback: allow toàn VPC
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-rds-sg" }
}

# Subnet Group — RDS chạy trong private subnet
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = { Name = "${var.project_name}-rds-subnet-group" }
}

# RDS PostgreSQL — 1 instance, 4 databases (user/product/order/payment)
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-postgres"

  engine         = "postgres"
  engine_version = "17"
  instance_class = var.rds_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100  # Auto-scaling storage tới 100GB
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "postgres"  # Database mặc định, các service DB tạo qua migration
  username = var.db_master_username
  password = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Không public — chỉ truy cập từ trong VPC
  publicly_accessible = false
  multi_az            = false  # Single-AZ để tiết kiệm chi phí

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  skip_final_snapshot       = true   # Đổi thành false ở production thật
  delete_automated_backups  = true

  tags = {
    Name      = "${var.project_name}-postgres"
    ManagedBy = "terraform"
  }
}
