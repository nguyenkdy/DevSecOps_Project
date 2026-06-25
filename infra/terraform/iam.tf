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
