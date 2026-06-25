# Queue: order-service publish → payment-service consume
resource "aws_sqs_queue" "order_created" {
  name                       = "${var.project_name}-order-created"
  message_retention_seconds  = 86400   # Giữ message 1 ngày
  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 20      # Long polling — giảm API call

  # Dead Letter Queue — message lỗi sau 3 lần retry
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_created_dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Name = "${var.project_name}-order-created" }
}

# Dead Letter Queue
resource "aws_sqs_queue" "order_created_dlq" {
  name                      = "${var.project_name}-order-created-dlq"
  message_retention_seconds = 604800  # Giữ 7 ngày để debug

  tags = { Name = "${var.project_name}-order-created-dlq" }
}

# Policy cho phép SNS publish vào queue (nếu cần fan-out sau này)
resource "aws_sqs_queue_policy" "order_created" {
  queue_url = aws_sqs_queue.order_created.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.order_created.arn
      Condition = {
        ArnEquals = {
          "aws:SourceAccount" = "715923838470"
        }
      }
    }]
  })
}
