# E-commerce Microservices Platform

Đồ án DevSecOps — Nền tảng thương mại điện tử theo kiến trúc microservices, triển khai trên AWS với pipeline **Jenkins CI → ArgoCD CD → EKS**.

---

## Mục lục

1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Tech Stack](#tech-stack)
3. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
4. [Luồng CI/CD](#luồng-cicd)
5. [Môi trường](#môi-trường)
6. [API Reference](#api-reference)
7. [Design Patterns](#design-patterns)
8. [Quyết định Cost](#quyết-định-cost)
9. [Roadmap](#roadmap)

---

## Tổng quan kiến trúc

### Kiến trúc tổng thể

```
                          ┌─────────────────────────────────────────┐
                          │              AWS Cloud                   │
                          │                                          │
  Browser ──────────────► │  CloudFront CDN (ảnh sản phẩm)         │
                          │       │                                  │
                          │       ▼                                  │
                          │  ALB ──► Frontend (Next.js 15)          │
                          │              │ API calls                 │
                          │              ▼                           │
                          │  ALB ──► API Gateway                    │
                          │   (JWT validation + rate limiting)       │
                          │              │                           │
                          │    ┌─────────┼──────────┬───────────┐   │
                          │    ▼         ▼          ▼           ▼   │
                          │  User    Product      Order      Payment │
                          │ Service  Service     Service    Service  │
                          │    │         │          │           │    │
                          │    ▼         ▼          │           ▼    │
                          │  user_db  product_db   │        payment_db│
                          │  (PG17)   (PG17+FTS)  │         (PG17)  │
                          │    │         │          │                │
                          │    │         ▼          ▼               │
                          │    │        S3      order_db            │
                          │    │      (ảnh)    (PG17)               │
                          │    │                   │                 │
                          │    ▼                   ▼                 │
                          │  Redis 8 ◄──────── Redis 8              │
                          │ (token    (cart TTL 7 ngày)             │
                          │ blacklist)                               │
                          │                   │ SQS                 │
                          │                   ▼                     │
                          │             Payment Service             │
                          │                   │ SNS                 │
                          │                   ▼                     │
                          │         Lambda (email via SES)          │
                          └─────────────────────────────────────────┘
```

### Services

| Service | Port | Chức năng |
|---------|------|-----------|
| api-gateway | 3000 | Entry point duy nhất — JWT validation, rate limiting, reverse proxy |
| user-service | 3001 | Đăng ký, đăng nhập, refresh token, profile, địa chỉ giao hàng |
| product-service | 3002 | Catalog sản phẩm, full-text search tiếng Việt, upload ảnh S3 |
| order-service | 3003 | Giỏ hàng (Redis), checkout, quản lý đơn hàng |
| payment-service | 3004 | VNPay/MoMo demo, QR code, SQS consumer, webhook |
| frontend | 3005 | Next.js 15 storefront (SSR + CSR) |

### Giao tiếp giữa services

```
Đồng bộ (REST):
  API Gateway ──► User/Product/Order/Payment Service

Bất đồng bộ (AWS):
  User Service ──► SNS (user.registered) ──► Lambda ──► SES (welcome email)
  Order Service ──► SQS (order-created) ──► Payment Service
  Payment Service ──► SNS (order.paid) ──► Lambda (email xác nhận)
```

---

## Tech Stack

### Backend — mỗi service
| Công nghệ | Version | Mục đích |
|-----------|---------|---------|
| Node.js | 22 LTS | Runtime |
| NestJS | 11.x | Framework |
| TypeScript | 5.8.x | Ngôn ngữ |
| TypeORM | 0.3.x | ORM + migrations |
| PostgreSQL | 17 | Database chính |
| Redis | 8 | Cart cache & token blacklist |
| AWS SDK v3 | 3.750+ | S3, SQS, SNS, SES |
| bcryptjs | 2.x | Bcrypt hash password |
| passport-jwt | 4.x | JWT guard |
| class-validator | 0.14.x | DTO validation |

### Frontend
| Công nghệ | Version | Mục đích |
|-----------|---------|---------|
| Next.js | 15.x | React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.8.x | Ngôn ngữ |
| TailwindCSS | 3.4.x | Styling |

### Infrastructure & DevSecOps
| Công nghệ | Mục đích |
|-----------|---------|
| AWS EKS | Kubernetes cluster (t3.medium On-Demand × 3) |
| AWS RDS PostgreSQL 17 | Managed database |
| AWS S3 + CloudFront | Product image storage + CDN |
| AWS SQS + SNS | Async messaging |
| AWS SES | Email service |
| AWS ECR | Docker image registry |
| AWS Secrets Manager | Secret management |
| AWS CloudWatch Container Insights | Metrics CPU/memory/network + logs tất cả pods |
| AWS X-Ray | Distributed tracing — visualize request qua microservices |
| AWS ADOT (OpenTelemetry) | Collector nhận traces từ services, forward lên X-Ray |
| OpenTelemetry SDK | Instrumentation trong mỗi NestJS service (`tracing.ts`) |
| Terraform | Infrastructure as Code |
| Helm | Kubernetes package manager |
| ArgoCD | GitOps continuous delivery |
| Argo Rollouts | Canary deployment cho frontend |
| Jenkins | CI pipeline (SonarQube Quality Gate + Trivy) |
| SonarQube | Static code analysis (SAST) — Quality Gate enforce trên mọi PR |
| Trivy | Container image security scan |
| Docker Compose + LocalStack | Local development |

---

## Cấu trúc thư mục

```
DevSecOps-Project/
│
├── services/                          # Backend microservices (NestJS)
│   ├── api-gateway/                   # Port 3000 — entry point
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   └── jwt.middleware.ts  # JWT validation trước proxy
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   ├── app.module.ts
│   │   │   ├── health.controller.ts
│   │   │   └── main.ts                # CORS, rate limit, proxy setup
│   │   ├── Dockerfile
│   │   └── Jenkinsfile
│   │
│   ├── user-service/                  # Port 3001
│   │   ├── src/
│   │   │   ├── auth/                  # Register, login, refresh, logout
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.service.spec.ts
│   │   │   ├── users/                 # Profile, addresses
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.service.spec.ts
│   │   │   ├── common/                # Guards, decorators
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   └── data-source.ts
│   │   │   └── app.module.ts
│   │   ├── Dockerfile
│   │   └── Jenkinsfile
│   │
│   ├── product-service/               # Port 3002
│   │   ├── src/
│   │   │   ├── products/              # CRUD, search, upload ảnh
│   │   │   │   ├── products.controller.ts
│   │   │   │   ├── products.service.ts
│   │   │   │   └── products.service.spec.ts
│   │   │   ├── categories/            # Category tree (self-referential)
│   │   │   ├── upload/
│   │   │   │   └── upload.service.ts  # S3 PutObject, CloudFront URL
│   │   │   └── database/
│   │   │       └── migrations/
│   │   │           └── 1700000000000-CreateProductsCategoriesFts.ts
│   │   ├── Dockerfile
│   │   └── Jenkinsfile
│   │
│   ├── order-service/                 # Port 3003
│   │   ├── src/
│   │   │   ├── cart/                  # Redis cart operations
│   │   │   │   └── cart.service.spec.ts
│   │   │   ├── orders/                # Checkout flow, order management
│   │   │   │   └── orders.service.spec.ts
│   │   │   └── database/
│   │   ├── Dockerfile
│   │   └── Jenkinsfile
│   │
│   └── payment-service/               # Port 3004
│       ├── src/
│       │   ├── payments/              # VNPay demo, QR, auto-approve
│       │   │   └── payments.service.spec.ts
│       │   ├── common/
│       │   │   └── sqs-consumer/      # Poll SQS queue order-created
│       │   └── database/
│       ├── Dockerfile
│       └── Jenkinsfile
│
├── frontend/                          # Next.js 15 — Port 3005
│   ├── src/
│   │   ├── app/                       # App Router
│   │   │   ├── page.tsx               # Homepage SSR (featured products)
│   │   │   ├── products/
│   │   │   │   ├── page.tsx           # Product listing SSR
│   │   │   │   └── [slug]/page.tsx    # Product detail
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/
│   │   │   │   ├── page.tsx
│   │   │   │   └── payment/page.tsx   # QR code thanh toán
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── components/
│   │   │   ├── products/
│   │   │   │   └── ProductCard.tsx
│   │   │   └── layout/
│   │   │       └── Header.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # JWT localStorage, auto-refresh 401
│   │   │   └── CartContext.tsx        # Cart persistence localStorage
│   │   └── lib/
│   │       ├── api.ts                 # API client (server + client side)
│   │       ├── types.ts
│   │       └── utils.ts
│   ├── next.config.js
│   ├── Dockerfile
│   └── Jenkinsfile
│
├── infra/
│   ├── docker/
│   │   ├── init-localstack.sh         # Tạo S3, SQS, SNS trên LocalStack
│   │   └── init-multiple-dbs.sh       # Tạo 4 databases PostgreSQL
│   │
│   ├── terraform/                     # AWS Infrastructure as Code
│   │   ├── main.tf                    # Provider, backend config
│   │   ├── vpc.tf                     # VPC, subnets, NAT Gateway
│   │   ├── eks.tf                     # EKS cluster + managed node group
│   │   ├── rds.tf                     # RDS PostgreSQL 17
│   │   ├── s3.tf                      # S3 bucket product images
│   │   ├── cloudfront.tf              # CloudFront distribution
│   │   ├── sqs.tf                     # SQS queues
│   │   ├── sns.tf                     # SNS topics
│   │   ├── iam.tf                     # IRSA roles cho service accounts
│   │   ├── secrets.tf                 # AWS Secrets Manager entries
│   │   ├── variables.tf
│   │   ├── outputs.tf                 # RDS endpoint, CloudFront URL, ...
│   │   └── terraform.tfvars.example
│   │
│   └── k8s/                           # Helm charts (GitOps — ArgoCD đọc)
│       ├── api-gateway/
│       │   ├── Chart.yaml
│       │   ├── values.yaml            # Image tag, env, ingress config
│       │   └── templates/
│       │       ├── deployment.yaml
│       │       ├── service.yaml
│       │       ├── configmap.yaml
│       │       ├── ingress.yaml       # ALB ingress annotation
│       │       └── external-secret.yaml
│       ├── user-service/              # (cấu trúc tương tự)
│       ├── product-service/
│       ├── order-service/
│       ├── payment-service/
│       ├── frontend/
│       └── redis/
│
├── docker-compose.yml                 # Local dev: tất cả services + LocalStack
├── CLAUDE.md                          # Context cho Claude Code AI assistant
└── README.md                          # File này
```

---

## Luồng CI/CD

### Tổng quan

```
Developer push code
        │
        ▼
   GitHub (main)
        │ webhook
        ▼
   Jenkins CI
        │
        ├─ Detect Changes (chỉ build service có thay đổi)
        ├─ Install dependencies
        ├─ Lint + TypeCheck / Build
        ├─ Unit Tests + Coverage
        ├─ Integration Tests (PostgreSQL + Redis containers)
        ├─ SonarQube SAST scan
        ├─ Trivy container security scan
        ├─ Build Docker image (multi-stage, production target)
        ├─ Push to AWS ECR (tag: {buildNum}-{gitSha} + latest)
        └─ Update Helm values.yaml (image tag mới) → git push
                    │
                    ▼
              GitHub (values.yaml updated)
                    │ ArgoCD polling / webhook
                    ▼
              ArgoCD CD
                    │
                    ├─ Detect diff trong Helm chart
                    ├─ Apply Kubernetes manifests
                    └─ Rolling update deployment (hoặc Canary nếu service dùng Argo Rollouts)
                                │
                                ▼
                         EKS (namespace: ecommerce)
                         Pod chạy image mới ✅
```

### Chi tiết Jenkins Pipeline (mỗi service)

```
Stage 1: Checkout
  └── git checkout từ GitHub

Stage 2: Detect Changes
  └── currentBuild.changeSets API (Jenkins SCM) — đọc danh sách file thay đổi chính xác từ push event
      Nếu không có file thay đổi trong services/{name}/ → SKIP toàn pipeline
      [skip ci] trong commit message → bỏ qua (tránh loop khi Jenkins push manifest)

Stage 3: Install
  └── npm ci --legacy-peer-deps

Stage 4: Lint & Build (parallel)
  ├── ESLint
  └── npm run build (TypeScript compile check)

Stage 5: Unit Test
  └── Jest + coverage report (lcov → SonarQube)

Stage 6: Integration Test
  └── Spin up PostgreSQL + Redis containers
      npm run test:integration
      Tear down containers

Stage 7: SonarQube SAST
  └── sonar-scanner: code smells, bugs, vulnerabilities, coverage

Stage 8: Trivy Security Scan
  └── trivy image --severity HIGH,CRITICAL
      (exit-code 0 = report only, không block)

Stage 9: Build & Push ECR  ← chỉ chạy trên nhánh main
  └── docker build --target production
      docker push ECR:{buildNum}-{gitSha}
      docker push ECR:latest

Stage 10: Update GitOps Manifest  ← chỉ chạy trên nhánh main
  └── sed -i "s|tag:.*|tag: {IMAGE_TAG}|" infra/k8s/{service}/values.yaml
      git commit -am "ci: update {service} to {IMAGE_TAG}"
      git push origin main
```

### Multi-repo monorepo strategy

Toàn bộ code nằm trong 1 repository. Jenkins có **6 pipeline jobs** riêng biệt (1 per service + frontend), mỗi job chỉ trigger build khi có file thay đổi trong thư mục service tương ứng. Điều này tránh rebuild không cần thiết.

### ArgoCD GitOps

ArgoCD theo dõi thư mục `infra/k8s/` trên nhánh `main`. Khi Jenkins cập nhật `image.tag` trong `values.yaml` và push lên GitHub, ArgoCD phát hiện diff và tự động sync (rolling update) deployment tương ứng trên EKS.

```
GitHub (infra/k8s/{service}/values.yaml)
         ↑ Jenkins push tag mới
         │
         └── ArgoCD poll mỗi 3 phút (hoặc webhook)
                    │
                    ▼
             Helm template render
                    │
                    ▼
             kubectl apply (rolling update)
```

---

## Môi trường

### URLs truy cập

| | Production | Dev |
|--|------------|-----|
| **Frontend** | http://k8s-ecommerc-frontend-74bcefc5c8-1434814566.ap-southeast-1.elb.amazonaws.com | http://k8s-ecommerc-frontend-098809d8ea-1169492521.ap-southeast-1.elb.amazonaws.com |
| **API Gateway** | http://k8s-ecommerc-apigatew-bac50f6700-1615445116.ap-southeast-1.elb.amazonaws.com | http://k8s-ecommerc-apigatew-afc7d5cc0d-1740156965.ap-southeast-1.elb.amazonaws.com |
| **ArgoCD** | http://a5909144139e1478b97145fd2f27661c-372496131.ap-southeast-1.elb.amazonaws.com | — |

- **Production**: namespace `ecommerce`, nhánh `main`, EKS cluster `ecommerce-eks` (ap-southeast-1)
- **Dev**: namespace `ecommerce-dev`, nhánh `develop`, cùng cluster — trigger tự động qua GitHub webhook → Jenkins Multibranch Pipeline

> Chi tiết hạ tầng, vận hành, shutdown/startup xem [CLAUDE.md](CLAUDE.md)

---

## API Reference

Tất cả requests đều qua **API Gateway** (`localhost:3000` local / ALB URL production).

### Authentication

```bash
BASE="http://localhost:3000/api/v1"

# Đăng ký
curl -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van A","email":"user@example.com","password":"Password@123"}'

# Đăng nhập → trả về { accessToken, refreshToken }
curl -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password@123"}'

# Refresh token
curl -X POST $BASE/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# Đăng xuất (blacklist token trong Redis)
curl -X POST $BASE/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

### Products (public — không cần token)

```bash
# Danh sách + search + filter
GET $BASE/products?page=1&limit=16&search=iphone&categoryId=<uuid>

# Chi tiết theo slug
GET $BASE/products/iphone-15-pro-max-256gb

# Danh mục phẳng
GET $BASE/categories

# Danh mục dạng cây
GET $BASE/categories/tree
```

### Products (admin only)

```bash
# Tạo sản phẩm
curl -X POST $BASE/products \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tên SP","price":1000000,"stockQty":50,"categoryId":"<uuid>"}'

# Upload ảnh sản phẩm (multipart)
curl -X POST $BASE/products/<id>/images \
  -H "Authorization: Bearer <adminToken>" \
  -F "file=@/path/to/image.jpg"

# Tạo category
curl -X POST $BASE/categories \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Điện thoại"}'
```

### Cart & Orders

```bash
# Thêm vào giỏ
curl -X POST $BASE/cart \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<uuid>","quantity":2}'

# Xem giỏ
curl $BASE/cart -H "Authorization: Bearer <accessToken>"

# Checkout — tạo đơn hàng
curl -X POST $BASE/orders/checkout \
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
curl $BASE/orders?page=1 -H "Authorization: Bearer <accessToken>"
```

### Payments

```bash
# Lấy QR code thanh toán (trả về base64 + paymentRef)
curl $BASE/payments/<orderId> -H "Authorization: Bearer <accessToken>"

# Auto-approve — duyệt ngay không cần scan QR (demo only)
curl -X POST $BASE/payments/auto-approve/<paymentRef> \
  -H "Authorization: Bearer <accessToken>"
```

---

## Design Patterns

### Distributed JWT
Mỗi service tự verify JWT bằng shared `JWT_ACCESS_SECRET` — không gọi User Service. Giảm latency và tránh single point of failure. Api Gateway validate và forward `x-user-id`, `x-user-email`, `x-user-role` qua internal headers.

### Snapshot Pattern (OrderItem)
Giá và tên sản phẩm được snapshot vào `order_items` tại thời điểm checkout. Lịch sử đơn hàng không bị ảnh hưởng khi sản phẩm thay đổi giá sau đó.

### Async Messaging (SQS Decoupling)
Order Service publish event `order-created` lên SQS sau khi tạo đơn thành công. Payment Service có SQS Consumer tự động poll queue và tạo Transaction. Hai service hoàn toàn decoupled — Order không cần biết Payment đang làm gì.

### Cart trên Redis
Giỏ hàng lưu Redis với key `cart:{userId}`, TTL 7 ngày. Tự expire, không tốn storage PostgreSQL, read/write O(1).

### Full-text Search tiếng Việt
PostgreSQL extension `unaccent` + `pg_trgm` + `to_tsvector` với config `vietnamese_unaccent`. DB trigger tự cập nhật `tsvector` khi product thay đổi. GIN index đảm bảo query sub-millisecond. Thay thế OpenSearch để tiết kiệm ~$25/tháng.

### GitOps (Jenkins → ArgoCD)
Jenkins CI chỉ build image và cập nhật `image.tag` trong `values.yaml` rồi push lên Git. ArgoCD là source of truth — tự detect diff và apply lên EKS. Không có bước `kubectl apply` trong CI pipeline.

### Canary Deployment (Argo Rollouts)
Frontend dùng `argoproj.io/v1alpha1 Rollout` thay vì `apps/v1 Deployment`. Khi có image tag mới, Argo Rollouts tự động:
1. Spin up 1 canary pod (new version) — ~33% traffic
2. **Pause** chờ verify thủ công
3. Promote → tất cả pods chuyển sang version mới

ALB sticky sessions (`stickiness.lb_cookie`) đảm bảo mỗi user luôn hit cùng một pod version — tránh CSS hash mismatch giữa canary và stable pods.

---

## Quyết định Cost

| AWS Service | Quyết định | Lý do |
|-------------|-----------|-------|
| Aurora PostgreSQL | ❌ → RDS PostgreSQL | Aurora không có free tier (~$29/tháng) |
| ElastiCache Redis | ❌ → Redis pod trong EKS | Tiết kiệm ~$12/tháng |
| OpenSearch | ❌ → PostgreSQL FTS | Tiết kiệm ~$25/tháng, đủ cho 10k sản phẩm |
| Cognito | ❌ → JWT tự build | Hiểu sâu hơn, không vendor lock-in |
| EKS | ✅ On-Demand t3.medium × 3 | 3 nodes để chạy đủ 6 services + monitoring stack |
| Lambda | ✅ | Free tier 1M invocations/tháng |
| S3 + CloudFront | ✅ | Gần miễn phí với traffic thấp |
| SQS + SNS | ✅ | Free tier 1M requests/tháng |
| SES | ✅ | 62k email/tháng miễn phí |
| Secrets Manager | ✅ | Bắt buộc cho DevSecOps |

**Chi phí ước tính production:** ~$110–130/tháng (3 × t3.medium ~$90 + RDS db.t3.micro ~$15 + NAT Gateway + CloudWatch Logs)

---

## Roadmap

### ✅ Đã hoàn thành

- [x] 6 microservices NestJS + frontend Next.js 15 hoàn chỉnh
- [x] 55 unit tests pass (user, product, order, payment)
- [x] Docker Compose local dev với LocalStack (S3, SQS, SNS, SES)
- [x] Terraform: VPC, EKS, RDS, S3, CloudFront, SQS, SNS, IAM IRSA
- [x] Helm charts cho 7 services (6 app + redis)
- [x] ArgoCD GitOps CD — auto sync khi values.yaml thay đổi
- [x] AWS Load Balancer Controller — ALB Ingress
- [x] Jenkins CI: Lint → Unit Test → Integration Test → SonarQube → Trivy → ECR → GitOps
- [x] IRSA cho product/order/payment/user service
- [x] RDS migrations production (compiled JS, không cần ts-node)
- [x] S3 product images + CloudFront CDN
- [x] SQS async: Order → Payment decoupling
- [x] CORS production configuration (CORS_ORIGIN env)
- [x] Full e-commerce flow: browse → cart → checkout → QR payment → confirm
- [x] **Dev/Test environment** — namespace `ecommerce-dev`, Jenkins Multibranch Pipeline (GitHub Branch Source + webhook), image tag `develop-{buildNum}-{sha}`, `values.dev.yaml` overlay, databases `user_db_dev`/`product_db_dev`/`order_db_dev`/`payment_db_dev`, K8s secrets `{svc}-dev-secret`, api-gateway-dev routing đến `-dev` services
- [x] **Reliable change detection** — Jenkins dùng `currentBuild.changeSets` API thay `git diff HEAD~1` — chính xác cho single commit, batch push, merge commit. `[skip ci]` ngăn manifest commits trigger lại pipeline
- [x] **Address management** — user-service thêm `PATCH/DELETE /api/v1/users/me/addresses/:id`; frontend profile page quản lý địa chỉ (thêm/sửa/xóa/đặt mặc định); checkout auto-fill từ địa chỉ đã lưu
- [x] **Canary Deployment (Argo Rollouts v1.9.0)** — frontend Helm chart chuyển `Deployment` → `Rollout`, strategy canary `setWeight: 40` + `pause: {}`, ALB sticky sessions, replicaCount: 3
- [x] **CloudWatch Container Insights + AWS X-Ray** — metrics/logs toàn bộ pods, distributed tracing qua 5 services; ADOT DaemonSet nhận OTLP traces từ NestJS (port 4318) → X-Ray; mỗi service có `tracing.ts` với OTel SDK instrumentation HTTP + NestJS + PostgreSQL + IORedis
- [x] **SonarQube Quality Gate enforcement** — tất cả 6 services pass QG; `sonar.qualitygate.wait=true` tích hợp trực tiếp vào scanner (không cần webhook); coverage exclusions cho infrastructure files; 62 unit tests tổng cộng

### 📋 Kế hoạch tiếp theo (nếu mở rộng)

- [ ] **HTTPS/TLS** — AWS ACM certificate + ALB HTTPS listener port 443
- [ ] **AWS Secrets Manager + External Secrets Operator** — thay plain-text K8s Secret bằng ESO sync từ Secrets Manager
- [ ] **Elastic IP cho Jenkins EC2** — SonarQube URL ổn định khi EC2 restart

---

## Lưu ý quan trọng

- **KHÔNG commit `.env`** — dùng `.env.example` làm template, secret quản lý qua AWS Secrets Manager
- **`synchronize: false`** trong tất cả TypeORM config — migrations phải chạy thủ công, KHÔNG để TypeORM tự tạo/alter schema
- **Price lưu BIGINT (VND)** — không dùng DECIMAL/FLOAT để tránh floating point error
- **Sau `docker compose down -v`** — phải chạy lại tất cả migrations
- **Image rebuild** sau khi thay đổi `package.json`: `docker compose build --no-cache <service>`
- **Admin role** — set trực tiếp trong DB: `UPDATE users SET role = 'admin' WHERE email = '...'`
