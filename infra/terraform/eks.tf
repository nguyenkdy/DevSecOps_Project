module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "${var.project_name}-eks"
  cluster_version = var.eks_cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets  # Public subnet — không cần NAT

  cluster_endpoint_public_access = true

  # Tắt KMS encryption — tránh cần quyền kms:TagResource, tiết kiệm $1/tháng
  create_kms_key            = false
  cluster_encryption_config = {}

  # Tắt CloudWatch logging — tránh cần quyền logs:CreateLogGroup, tiết kiệm cost
  cluster_enabled_log_types   = []
  create_cloudwatch_log_group = false

  cluster_addons = {
    coredns            = { most_recent = true }
    kube-proxy         = { most_recent = true }
    vpc-cni            = { most_recent = true }
    aws-ebs-csi-driver = { most_recent = true }
  }

  eks_managed_node_groups = {
    spot = {
      name = "${var.project_name}-spot-nodes"

      # Spot instances — rẻ hơn On-Demand ~70-80%
      # Liệt kê nhiều loại để tăng khả năng có Spot capacity
      capacity_type  = "SPOT"
      instance_types = var.eks_node_instance_types

      min_size     = var.eks_node_min_size
      max_size     = var.eks_node_max_size
      desired_size = var.eks_node_desired_size

      subnet_ids = module.vpc.public_subnets

      # Disk nhỏ lại — tiết kiệm thêm EBS cost
      disk_size = 20

      labels = { role = "application" }
    }
  }

  enable_cluster_creator_admin_permissions = true

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}
