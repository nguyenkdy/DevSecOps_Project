resource "aws_s3_bucket" "product_images" {
  bucket        = var.s3_bucket_name
  force_destroy = true  # Cho phép xóa bucket dù còn file — tiện cho dev

  tags = {
    Name      = "${var.project_name}-product-images"
    ManagedBy = "terraform"
  }
}

# Chặn public access — chỉ truy cập qua CloudFront
resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS cho phép product-service upload từ server
resource "aws_s3_bucket_cors_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]  # Giới hạn lại khi có domain thật
    max_age_seconds = 3600
  }
}

# Origin Access Control — CloudFront dùng để đọc S3 thay vì public URL
resource "aws_cloudfront_origin_access_control" "product_images" {
  name                              = "${var.project_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket Policy — chỉ cho CloudFront đọc
resource "aws_s3_bucket_policy" "product_images" {
  bucket = aws_s3_bucket.product_images.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontRead"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.product_images.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.product_images.arn
        }
      }
    }]
  })
  depends_on = [aws_cloudfront_distribution.product_images]
}
