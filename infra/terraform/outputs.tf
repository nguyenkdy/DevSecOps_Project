# Sau khi terraform apply, copy các giá trị này vào Helm values.yaml

output "eks_cluster_name" {
  description = "Tên EKS cluster — dùng để cấu hình kubectl"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS endpoint → điền vào DATABASE_HOST trong Helm values"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  value = aws_db_instance.main.port
}

output "s3_bucket_name" {
  description = "S3 bucket name → điền vào S3_BUCKET_NAME trong Helm values"
  value       = aws_s3_bucket.product_images.bucket
}

output "cloudfront_url" {
  description = "CloudFront URL → điền vào CLOUDFRONT_URL trong Helm values"
  value       = "https://${aws_cloudfront_distribution.product_images.domain_name}"
}

output "sqs_order_created_url" {
  description = "SQS URL → điền vào SQS_ORDER_CREATED_URL trong Helm values"
  value       = aws_sqs_queue.order_created.url
}

output "sns_user_registered_arn" {
  description = "SNS ARN → điền vào SNS_USER_REGISTERED_TOPIC_ARN trong Helm values"
  value       = aws_sns_topic.user_registered.arn
}

output "sns_order_paid_arn" {
  description = "SNS ARN → điền vào SNS_ORDER_PAID_TOPIC_ARN trong Helm values"
  value       = aws_sns_topic.order_paid.arn
}

output "irsa_product_service_role_arn" {
  description = "IAM Role ARN cho product-service ServiceAccount"
  value       = aws_iam_role.product_service.arn
}

output "irsa_order_service_role_arn" {
  value = aws_iam_role.order_service.arn
}

output "irsa_payment_service_role_arn" {
  value = aws_iam_role.payment_service.arn
}

output "irsa_user_service_role_arn" {
  value = aws_iam_role.user_service.arn
}

output "kubectl_config_command" {
  description = "Chạy lệnh này để cấu hình kubectl sau khi EKS tạo xong"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
