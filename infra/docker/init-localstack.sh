#!/bin/bash
# Khởi tạo SNS topic, SQS queue, S3 bucket trong LocalStack khi container ready.
awslocal sns create-topic --name user-events
awslocal sns create-topic --name order-events
awslocal sqs create-queue --queue-name order-created
awslocal s3 mb s3://ecom-media-dev
awslocal s3 mb s3://ecom-static-dev
echo "LocalStack initialized: SNS topics, SQS queues, S3 buckets"
