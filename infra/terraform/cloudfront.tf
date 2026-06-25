resource "aws_cloudfront_distribution" "product_images" {
  enabled             = true
  comment             = "${var.project_name} product images CDN"
  default_root_object = ""
  price_class         = "PriceClass_200"  # Asia + US + EU (bỏ South America)

  origin {
    domain_name              = aws_s3_bucket.product_images.bucket_regional_domain_name
    origin_id                = "S3-${var.s3_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.product_images.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-${var.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    # Cache ảnh 1 ngày
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true  # Dùng cert mặc định *.cloudfront.net
  }

  tags = {
    Name      = "${var.project_name}-cdn"
    ManagedBy = "terraform"
  }
}
