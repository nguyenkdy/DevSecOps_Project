module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "${var.project_name}-eks"
  cluster_version = var.eks_cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cho phép kubectl từ máy local truy cập cluster
  cluster_endpoint_public_access = true

  # EKS Addons — các thành phần cốt lõi của cluster
  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
    aws-ebs-csi-driver     = { most_recent = true }  # Cần cho PVC của Redis
  }

  # Managed Node Group — AWS quản lý việc provision EC2
  eks_managed_node_groups = {
    main = {
      name           = "${var.project_name}-nodes"
      instance_types = [var.eks_node_instance_type]

      min_size     = var.eks_node_min_size
      max_size     = var.eks_node_max_size
      desired_size = var.eks_node_desired_size

      # Node dùng private subnet, traffic ra ngoài qua NAT
      subnet_ids = module.vpc.private_subnets

      labels = {
        role = "application"
      }
    }
  }

  # Cho phép user tạo cluster có quyền admin
  enable_cluster_creator_admin_permissions = true

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}

# OIDC Provider — cần cho IRSA (IAM Roles for Service Accounts)
# Cho phép pod trong EKS dùng IAM role mà không cần access key
data "aws_iam_openid_connect_provider" "eks" {
  url = module.eks.cluster_oidc_issuer_url
  depends_on = [module.eks]
}
