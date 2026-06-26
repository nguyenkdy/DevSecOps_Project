module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]   # Chỉ dùng cho RDS
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"] # EKS nodes đặt ở đây

  # Bỏ NAT Gateway — EKS nodes dùng public subnet, truy cập internet trực tiếp
  # Tiết kiệm $32.40/tháng NAT Gateway + $3.60/tháng Elastic IP = $36/tháng
  enable_nat_gateway = false
  single_nat_gateway = false

  # Nodes cần public IP để pull ECR images mà không qua NAT
  map_public_ip_on_launch = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags để AWS Load Balancer Controller tự discover subnet
  public_subnet_tags = {
    "kubernetes.io/role/elb"                            = 1
    "kubernetes.io/cluster/${var.project_name}-eks"     = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                   = 1
    "kubernetes.io/cluster/${var.project_name}-eks"     = "shared"
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}
