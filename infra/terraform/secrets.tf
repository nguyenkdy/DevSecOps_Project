# Secrets Manager — lưu credentials nhạy cảm cho từng service
# Sau khi tạo xong, enable externalSecret.enabled=true trong Helm values

resource "aws_secretsmanager_secret" "user_service" {
  name                    = "/ecommerce/user-service"
  recovery_window_in_days = 0  # Xóa ngay, không cần 30 ngày recovery
}

resource "aws_secretsmanager_secret_version" "user_service" {
  secret_id = aws_secretsmanager_secret.user_service.id
  secret_string = jsonencode({
    DATABASE_PASSWORD  = var.db_master_password
    JWT_ACCESS_SECRET  = "CHANGE_ME_STRONG_SECRET_32_CHARS_MIN"
    JWT_REFRESH_SECRET = "CHANGE_ME_ANOTHER_STRONG_SECRET_32_CHARS"
  })
}

resource "aws_secretsmanager_secret" "product_service" {
  name                    = "/ecommerce/product-service"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "product_service" {
  secret_id = aws_secretsmanager_secret.product_service.id
  secret_string = jsonencode({
    DATABASE_PASSWORD = var.db_master_password
    JWT_ACCESS_SECRET = "CHANGE_ME_STRONG_SECRET_32_CHARS_MIN"
  })
}

resource "aws_secretsmanager_secret" "order_service" {
  name                    = "/ecommerce/order-service"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "order_service" {
  secret_id = aws_secretsmanager_secret.order_service.id
  secret_string = jsonencode({
    DATABASE_PASSWORD = var.db_master_password
    JWT_ACCESS_SECRET = "CHANGE_ME_STRONG_SECRET_32_CHARS_MIN"
  })
}

resource "aws_secretsmanager_secret" "payment_service" {
  name                    = "/ecommerce/payment-service"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "payment_service" {
  secret_id = aws_secretsmanager_secret.payment_service.id
  secret_string = jsonencode({
    DATABASE_PASSWORD = var.db_master_password
    JWT_ACCESS_SECRET = "CHANGE_ME_STRONG_SECRET_32_CHARS_MIN"
  })
}

resource "aws_secretsmanager_secret" "api_gateway" {
  name                    = "/ecommerce/api-gateway"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "api_gateway" {
  secret_id = aws_secretsmanager_secret.api_gateway.id
  secret_string = jsonencode({
    JWT_ACCESS_SECRET = "CHANGE_ME_STRONG_SECRET_32_CHARS_MIN"
  })
}
