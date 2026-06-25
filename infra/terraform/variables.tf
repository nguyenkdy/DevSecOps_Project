variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Tên project — dùng làm prefix cho tên resource"
  type        = string
  default     = "ecommerce"
}

variable "eks_cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.31"
}

variable "eks_node_instance_type" {
  description = "EC2 instance type cho EKS worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "eks_node_desired_size" {
  description = "Số node mặc định"
  type        = number
  default     = 2
}

variable "eks_node_min_size" {
  description = "Số node tối thiểu (autoscaling)"
  type        = number
  default     = 1
}

variable "eks_node_max_size" {
  description = "Số node tối đa (autoscaling)"
  type        = number
  default     = 3
}

variable "rds_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "db_master_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_master_password" {
  description = "PostgreSQL master password — điền trong terraform.tfvars"
  type        = string
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket cho product images"
  type        = string
  default     = "ecommerce-product-images-715923838470"
}
