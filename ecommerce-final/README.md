# E-commerce Microservices Platform

Đồ án DevSecOps — Nền tảng thương mại điện tử theo kiến trúc microservices, deploy trên AWS với pipeline Jenkins CI → ArgoCD CD → EKS.

## Tổng quan kiến trúc

6 services độc lập, mỗi service có database riêng, giao tiếp qua REST (đồng bộ) và SQS/SNS (bất đồng bộ).

```
Browser / Mobile
      │
      ▼
  Frontend (Next.js 15) :3005
      │ API calls
      ▼
  API Gateway :3000  ◄─── JWT validation + rate limiting
      │
      ├──► User Service :3001 ──► user_db (PostgreSQL 17)
      │                      └──► Redis 8 (token blacklist)
      │                      └──► SNS → SES (welcome email)
      │
      ├──► Product Service :3002 ──► product_db (PostgreSQL 17 + FTS)
      │                         └──► S3 (product images)
      │
      ├──► Order Service :3003 ──► order_db (PostgreSQL 17)
      │                       └──► Redis 8 (cart TTL 7 ngày)
      │                       └──► SQS → Payment Service
      │
      └──► Payment Service :3004 ──► payment_db (PostgreSQL 17)
                                 └──► SNS (order.paid event)
```

## Services

| Service | Port | Trạng thái | Chức năng |
|---------|------|-----------|-----------|
| api-gateway | 3000 | ✅ Hoàn thành | Entry point, routing, JWT validation, rate limiting |
| user-service | 3001 | ✅ Hoàn thành | Auth, profile, địa chỉ giao hàng |
| product-service | 3002 | ✅ Hoàn thành | Catalog, full-text search tiếng Việt, upload ảnh S3 |
| order-service | 3003 | ✅ Hoàn thành | Giỏ hàng (Redis), checkout, đơn hàng |
| payment-service | 3004 | ✅ Hoàn thành | VNPay/MoMo demo, QR code, webhook |
| frontend | 3005 | ✅ Hoàn thành | Next.js 15 storefront, SSR + CSR |

## Tech Stack

### Backend
| Công nghệ | Version | Mục đích |
|-----------|---------|---------|
| Node.js | 22 LTS | Runtime |
| NestJS | 11.x | Framework microservices |
| TypeScript | 5.8.x | Ngôn ngữ |
| TypeORM | 0.3.x | ORM cho PostgreSQL |
| PostgreSQL | 17 | Database chính |
| Redis | 8 | Cart cache & token blacklist |
| AWS SDK v3 | 3.750+ | S3, SQS, SNS, SES |
| passport-jwt | 4.x | JWT authentication |
| class-validator | 0.14.x | DTO validation |

### Frontend
| Công nghệ | Version | Mục đích |
|-----------|---------|---------|
| Next.js | 15.x | React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.8.x | Ngôn ngữ |
| TailwindCSS | 3.4.x | Styling |

### Infrastructure (Local Dev)
| Công nghệ | Version | Mục đích |
|-----------|---------|---------|
| Docker Compose | 2.x | Orchestration local |
| LocalStack | 3.4 | Giả lập AWS (S3, SQS, SNS, SES) |

### CI/CD & Security (Production)
- **CI**: Jenkins (Jenkinsfile trong từng service)
- **CD**: ArgoCD + Helm charts
- **Infra**: Terraform + AWS EKS
- **Security**: SonarQube, Trivy, AWS Secrets Manager + External Secrets Operator

## Chạy local

### Yêu cầu
- Docker Desktop (hoặc Docker Engine + Docker Compose plugin trên Linux)

### Khởi động toàn bộ hệ thống

```bash
# Clone repo
git clone <repo-url>
cd ecommerce-final

# Khởi động tất cả services
docker compose up -d

# Kiểm tra trạng thái
docker compose ps
```

### Chạy migrations (lần đầu hoặc sau khi reset DB)

```bash
docker compose exec user-service npm run migration:run
docker compose exec product-service npm run migration:run
docker compose exec order-service npm run migration:run
docker compose exec payment-service npm run migration:run
```

### Truy cập

| Endpoint | URL |
|----------|-----|
| Frontend | http://localhost:3005 |
| API Gateway | http://localhost:3000 |
| Health check | http://localhost:3001/api/v1/health |

### Xem logs

```bash
docker compose logs -f                  # Tất cả services
docker compose logs -f user-service     # Một service cụ thể
```

### Reset hoàn toàn (xóa toàn bộ data)

```bash
docker compose down -v    # Xóa containers + volumes
docker compose up -d      # Khởi động lại từ đầu
# Sau đó chạy lại migrations
```

### Rebuild sau khi thay đổi dependencies

```bash
docker compose build --no-cache
docker compose up -d
```

## API Reference

### Authentication (qua API Gateway :3000)

```bash
# Đăng ký tài khoản
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van A","email":"user@example.com","password":"Password@123"}'

# Đăng nhập — trả về { accessToken, refreshToken }
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password@123"}'

# Refresh access token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# Đăng xuất
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

### Products (public, không cần token)

```bash
# Danh sách sản phẩm với search + filter
GET http://localhost:3000/api/v1/products?page=1&limit=16&search=áo&categoryId=<uuid>

# Chi tiết sản phẩm theo slug
GET http://localhost:3000/api/v1/products/ao-thun-nam

# Danh mục dạng phẳng
GET http://localhost:3000/api/v1/categories

# Danh mục dạng cây
GET http://localhost:3000/api/v1/categories/tree
```

### Cart & Orders (cần JWT)

```bash
# Thêm vào giỏ hàng
curl -X POST http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<uuid>","quantity":2}'

# Xem giỏ hàng
curl http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer <accessToken>"

# Checkout — tạo đơn hàng
curl -X POST http://localhost:3000/api/v1/orders/checkout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "fullName": "Nguyen Van A",
      "phone": "0901234567",
      "addressLine1": "123 Nguyen Trai",
      "city": "Ho Chi Minh"
    },
    "paymentMethod": "vnpay"
  }'

# Lịch sử đơn hàng
curl http://localhost:3000/api/v1/orders?page=1 \
  -H "Authorization: Bearer <accessToken>"
```

### Payments (cần JWT)

```bash
# Auto-approve — duyệt ngay không cần scan QR (chỉ cho demo)
curl -X POST http://localhost:3000/api/v1/payments/auto-approve/<paymentRef> \
  -H "Authorization: Bearer <accessToken>"
```

## Cấu trúc thư mục

```
ecommerce-final/
├── services/
│   ├── api-gateway/          # NestJS — Port 3000
│   │   └── src/
│   │       ├── auth/         # JWT validation middleware
│   │       ├── proxy/        # http-proxy-middleware config
│   │       └── main.ts
│   ├── user-service/         # NestJS — Port 3001
│   │   └── src/
│   │       ├── auth/         # Register, login, refresh, logout
│   │       ├── users/        # Profile, addresses
│   │       └── database/     # TypeORM DataSource + migrations
│   ├── product-service/      # NestJS — Port 3002
│   │   └── src/
│   │       ├── products/     # CRUD + search + upload
│   │       ├── categories/   # Category tree
│   │       └── database/     # Migrations (FTS, GIN index)
│   ├── order-service/        # NestJS — Port 3003
│   │   └── src/
│   │       ├── cart/         # Redis cart operations
│   │       ├── orders/       # Checkout + order management
│   │       └── database/
│   └── payment-service/      # NestJS — Port 3004
│       └── src/
│           ├── payments/     # VNPay demo, QR, auto-approve
│           ├── common/       # SQS consumer module
│           └── database/
├── frontend/                 # Next.js 15 — Port 3005
│   └── src/
│       ├── app/              # App Router pages
│       ├── components/       # UI components
│       ├── contexts/         # AuthContext, CartContext
│       └── lib/              # API client, types, utils
├── infra/
│   ├── docker/
│   │   ├── init-localstack.sh       # Tạo S3 bucket, SQS queue, SNS topic
│   │   └── init-multiple-dbs.sh     # Tạo 4 databases PostgreSQL
│   ├── terraform/            # AWS infrastructure as code
│   └── k8s/                  # Helm charts cho ArgoCD
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

## Patterns thiết kế

### Distributed JWT
Mỗi service tự verify JWT bằng shared `JWT_ACCESS_SECRET` — không gọi User Service. Giảm latency và tránh single point of failure.

### Snapshot Pattern (OrderItem)
Giá và tên sản phẩm được snapshot vào `order_items` lúc checkout. Lịch sử đơn hàng không bị ảnh hưởng khi sản phẩm thay đổi giá sau đó.

### Async Messaging (SQS)
Order Service publish `order-created` lên SQS. Payment Service consume queue này bất đồng bộ để tạo Transaction. Decoupling hoàn toàn hai service.

### Cart trên Redis
Giỏ hàng lưu Redis với key `cart:{userId}`, TTL 7 ngày. Tự expire, không tốn dung lượng PostgreSQL.

### Full-text Search tiếng Việt
Dùng PostgreSQL extension `unaccent` + `pg_trgm` + `to_tsvector` với config `vietnamese_unaccent`. GIN index đảm bảo query nhanh. Thay thế OpenSearch để tiết kiệm cost.

## Quyết định về cost

| AWS Service | Quyết định | Lý do |
|-------------|-----------|-------|
| Aurora PostgreSQL | ❌ → RDS PostgreSQL | Aurora không có free tier (~$29/tháng) |
| ElastiCache | ❌ → Redis pod trong EKS | Tiết kiệm $12/tháng |
| OpenSearch | ❌ → PostgreSQL FTS | Tiết kiệm $25/tháng, đủ cho catalog ~10k sản phẩm |
| Cognito | ❌ → JWT tự build | Hiểu sâu hơn, không vendor lock-in |
| EKS | ✅ | Bắt buộc — đề tài DevSecOps |
| Lambda | ✅ | Free tier 1M invocations/tháng |
| S3 + CloudFront | ✅ | Gần miễn phí với traffic thấp |
| SQS + SNS | ✅ | Free tier 1M requests/tháng |
| SES | ✅ | 62k email/tháng miễn phí |
| Secrets Manager | ✅ | Bắt buộc cho DevSecOps |

## Môi trường Deploy

| | Dev/Test | Production |
|--|----------|-----------|
| Trigger | Push nhánh `develop` | Merge `main` + manual approval |
| EKS | 1 cluster (namespace dev/test) | Cluster riêng |
| RDS | t3.micro, tắt ngoài giờ | t3.small multi-AZ |
| Deploy | Tự động (ArgoCD) | ArgoCD approval gate |
| Secret | AWS Secrets Manager + ESO | AWS Secrets Manager + ESO |

## Lưu ý quan trọng

- **KHÔNG commit `.env`** — dùng `.env.example` làm template, secret quản lý qua AWS Secrets Manager
- **Code viết trên Windows**, deploy trên Ubuntu Linux qua Docker — KHÔNG chạy `npm install` hoặc `docker` trực tiếp trên máy dev
- **Sau khi thay đổi `package.json`**: `docker compose build --no-cache <service> && docker compose up -d <service>`
- **`synchronize: false`** trong tất cả services — migrations phải chạy thủ công, KHÔNG để TypeORM tự tạo schema
- **Sau `docker compose down -v`**: bắt buộc chạy lại tất cả migrations
