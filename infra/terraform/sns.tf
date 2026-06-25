# Topic: user-service publish khi có user mới đăng ký → Lambda gửi welcome email
resource "aws_sns_topic" "user_registered" {
  name = "${var.project_name}-user-registered"

  tags = { Name = "${var.project_name}-user-registered" }
}

# Topic: payment-service publish khi thanh toán thành công → order-service cập nhật status
resource "aws_sns_topic" "order_paid" {
  name = "${var.project_name}-order-paid"

  tags = { Name = "${var.project_name}-order-paid" }
}
