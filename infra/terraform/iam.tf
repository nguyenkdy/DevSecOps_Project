locals {
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  namespace         = "ecommerce"
}

# ─── IRSA: product-service → S3 + CloudFront ────────────────────────────────

data "aws_iam_policy_document" "product_service_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${local.namespace}:product-service"]
    }
  }
}

resource "aws_iam_role" "product_service" {
  name               = "${var.project_name}-product-service-role"
  assume_role_policy = data.aws_iam_policy_document.product_service_assume.json
}

resource "aws_iam_role_policy" "product_service_s3" {
  name = "s3-access"
  role = aws_iam_role.product_service.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.product_images.arn,
        "${aws_s3_bucket.product_images.arn}/*"
      ]
    }]
  })
}

# ─── IRSA: order-service → SQS publish ──────────────────────────────────────

data "aws_iam_policy_document" "order_service_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${local.namespace}:order-service"]
    }
  }
}

resource "aws_iam_role" "order_service" {
  name               = "${var.project_name}-order-service-role"
  assume_role_policy = data.aws_iam_policy_document.order_service_assume.json
}

resource "aws_iam_role_policy" "order_service_sqs" {
  name = "sqs-publish"
  role = aws_iam_role.order_service.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
      Resource = aws_sqs_queue.order_created.arn
    }]
  })
}

# ─── IRSA: payment-service → SQS consume + SNS publish ──────────────────────

data "aws_iam_policy_document" "payment_service_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${local.namespace}:payment-service"]
    }
  }
}

resource "aws_iam_role" "payment_service" {
  name               = "${var.project_name}-payment-service-role"
  assume_role_policy = data.aws_iam_policy_document.payment_service_assume.json
}

resource "aws_iam_role_policy" "payment_service_sqs_sns" {
  name = "sqs-consume-sns-publish"
  role = aws_iam_role.payment_service.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"]
        Resource = aws_sqs_queue.order_created.arn
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.order_paid.arn
      }
    ]
  })
}

# ─── IRSA: user-service → SNS publish + SES send ────────────────────────────

data "aws_iam_policy_document" "user_service_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${local.namespace}:user-service"]
    }
  }
}

resource "aws_iam_role" "user_service" {
  name               = "${var.project_name}-user-service-role"
  assume_role_policy = data.aws_iam_policy_document.user_service_assume.json
}

resource "aws_iam_role_policy" "user_service_sns" {
  name = "sns-publish"
  role = aws_iam_role.user_service.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = aws_sns_topic.user_registered.arn
    }]
  })
}

# ─── IRSA: tất cả services → Secrets Manager read ───────────────────────────

resource "aws_iam_policy" "secrets_read" {
  name = "${var.project_name}-secrets-read"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:715923838470:secret:/ecommerce/*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "product_service_secrets" {
  role       = aws_iam_role.product_service.name
  policy_arn = aws_iam_policy.secrets_read.arn
}

resource "aws_iam_role_policy_attachment" "order_service_secrets" {
  role       = aws_iam_role.order_service.name
  policy_arn = aws_iam_policy.secrets_read.arn
}

resource "aws_iam_role_policy_attachment" "payment_service_secrets" {
  role       = aws_iam_role.payment_service.name
  policy_arn = aws_iam_policy.secrets_read.arn
}

resource "aws_iam_role_policy_attachment" "user_service_secrets" {
  role       = aws_iam_role.user_service.name
  policy_arn = aws_iam_policy.secrets_read.arn
}

# ─── IRSA: CloudWatch Container Insights agent ──────────────────────────────
# Amazon CloudWatch Observability addon dùng service account này để ghi metrics
# và logs của tất cả pods lên CloudWatch

data "aws_iam_policy_document" "cloudwatch_agent_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:amazon-cloudwatch:cloudwatch-agent"]
    }
  }
}

resource "aws_iam_role" "cloudwatch_agent" {
  name               = "${var.project_name}-cloudwatch-agent-role"
  assume_role_policy = data.aws_iam_policy_document.cloudwatch_agent_assume.json

  tags = { Project = var.project_name }
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_server_policy" {
  role       = aws_iam_role.cloudwatch_agent.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# ─── IRSA: ADOT Collector → AWS X-Ray + CloudWatch Logs ─────────────────────
# ADOT DaemonSet nhận traces từ các microservice qua OTLP (port 4318)
# rồi forward lên X-Ray và CloudWatch Logs

data "aws_iam_policy_document" "adot_collector_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringLike"
      variable = "${local.oidc_provider_url}:sub"
      # Hỗ trợ cả opentelemetry-operator-system lẫn custom namespace
      values = [
        "system:serviceaccount:opentelemetry-operator-system:*",
        "system:serviceaccount:amazon-metrics:*",
      ]
    }
  }
}

resource "aws_iam_role" "adot_collector" {
  name               = "${var.project_name}-adot-collector-role"
  assume_role_policy = data.aws_iam_policy_document.adot_collector_assume.json

  tags = { Project = var.project_name }
}

resource "aws_iam_role_policy_attachment" "adot_xray" {
  role       = aws_iam_role.adot_collector.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy_attachment" "adot_cloudwatch" {
  role       = aws_iam_role.adot_collector.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}
