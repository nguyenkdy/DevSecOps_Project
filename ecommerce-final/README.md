# E-commerce Microservices Platform

Đồ án e-commerce theo kiến trúc microservices, triển khai trên AWS với pipeline DevSecOps đầy đủ (Jenkins CI, ArgoCD CD, EKS).

## Kiến trúc tổng quan

5 microservices độc lập, mỗi service một database riêng, giao tiếp qua REST (đồng bộ) và SQS/SNS (bất đồng bộ).

| Service | Port | Vai trò | Trạng thái |
|---------|------|---------|-----------|
| api-gateway | 3000 | Cổng vào, routing, JWT validation | Chưa code |
| user-service | 3001 | Auth, profile, địa chỉ | **Hoàn thành** |
| product-service | 3002 | Catalog, tìm kiếm, upload ảnh S3 | Chưa code |
| order-service | 3003 | Cart, checkout, đơn hàng | Chưa code |
| payment-service | 3004 | VNPay/MoMo, webhook | Chưa code |
| frontend | 3005 | Next.js storefront | Chưa code |

## Cấu trúc thư mục

```
ecommerce/
├── services/
│   ├── user-service/      # NestJS — auth & users (đã xong)
│   ├── product-service/   # NestJS — catalog
│   ├── order-service/     # NestJS — orders
│   ├── payment-service/   # NestJS — payments
│   └── api-gateway/       # NestJS — gateway
├── frontend/              # Next.js
├── infra/
│   ├── docker/            # Init scripts cho local
│   ├── terraform/         # AWS infrastructure as code
│   └── k8s/               # Helm charts cho ArgoCD
└── docker-compose.yml     # Local development
```

## Chạy local

```bash
# Khởi động toàn bộ infra (PostgreSQL, Redis, LocalStack) + user-service
docker compose up -d

# Kiểm tra user-service đã chạy
curl http://localhost:3001/api/v1/health
```

LocalStack giả lập S3, SQS, SNS, SES hoàn toàn trên máy. Code dùng AWS SDK bình thường, chỉ trỏ endpoint vào `http://localhost:4566`. Khi deploy lên AWS thật, bỏ endpoint override là xong — không đổi code.

## Workflow phát triển

1. **Build local** — code từng service, test với `docker compose`
2. **Container hóa** — mỗi service có Dockerfile multi-stage riêng
3. **CI** — push code → Jenkins build, test, scan, push ECR
4. **CD** — ArgoCD watch Git repo, sync image mới lên EKS

## Môi trường

| | Dev/Test | Production |
|--|----------|-----------|
| Trigger | Push nhánh `develop` | Merge `main` + manual approval |
| EKS | 1 cluster (namespace dev/test) | Cluster riêng |
| RDS | t3.micro, tắt ngoài giờ | t3.small |
| Deploy | Tự động | ArgoCD approval gate |

## Tech stack

- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, ioredis
- **Auth**: JWT (access + refresh token rotation), bcrypt
- **Async**: AWS SQS, SNS, Lambda
- **Storage**: S3 + CloudFront
- **CI/CD**: Jenkins, ArgoCD, Helm, Terraform
- **Security**: SonarQube, Trivy, AWS Secrets Manager
- **Testing**: Jest (unit + integration + e2e), Supertest

## Lưu ý về cost (đồ án sinh viên)

Một số managed service được thay bằng self-hosted để tiết kiệm, có ghi rõ trade-off:
- Aurora → RDS PostgreSQL (Aurora không có free tier)
- ElastiCache → Redis pod trong EKS
- OpenSearch → PostgreSQL full-text search (pg_trgm)
- Cognito → JWT tự build trong user-service

Ở production thật sẽ dùng managed service tương ứng. Quyết định chi tiết xem trong báo cáo.
