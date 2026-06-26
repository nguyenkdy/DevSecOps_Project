terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Dùng local state cho đồ án — không cần S3 bucket
  # Nếu muốn chuyển sang remote backend sau, uncomment:
  # backend "s3" {
  #   bucket         = "ecommerce-tfstate-715923838470"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "ecommerce-tfstate-lock"
  # }
}

provider "aws" {
  region = var.aws_region
}
