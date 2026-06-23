# Project Context — E-commerce Microservices

> File này là "bộ nhớ" cho Claude Code trong VSCode.
> Đặt ở root project, Claude Code sẽ tự đọc khi bắt đầu session.

## Tổng quan project

Đồ án DevSecOps — E-commerce platform theo kiến trúc microservices, deploy trên AWS với pipeline Jenkins CI → ArgoCD CD → EKS. Project cấp sinh viên nhưng thiết kế gần thực tế nhất có thể.

## Tech stack

- **Backend**: NestJS (TypeScript), TypeORM, PostgreSQL
- **Auth**: JWT tự build (access 15 phút + refresh 7 ngày với rotation)
- **Cache/Session**: Redis (tự deploy trong EKS pod, không dùng ElastiCache)
- **Async messaging**: AWS SQS + SNS
- **Storage**: AWS S3 + CloudFront CDN
- **Serverless**: AWS Lambda (payment webhook, image resize, email)
- **Email**: AWS SES
- **Search**: PostgreSQL FTS (pg_trgm + unaccent) — thay OpenSearch để tiết kiệm cost
- **CI**: Jenkins (Jenkinsfile trong từng service)
- **CD**: ArgoCD + Helm charts
- **Infra**: Terraform, AWS EKS
- **Security**: SonarQube, Trivy, AWS Secrets Manager + External Secrets Operator
- **Local dev**: Docker Compose + LocalStack (giả lập S3/SQS/SNS/SES)

## Cấu trúc monorepo

```
ecommerce/
├── services/
│   ├── user-service/      # Port 3001 — HOÀN THÀNH
│   ├── product-service/   # Port 3002 — HOÀN THÀNH
│   ├── order-service/     # Port 3003 — HOÀN THÀNH ✅
│   ├── payment-service/   # Port 3004 — HOÀN THÀNH ✅
│   └── api-gateway/       # Port 3000 — HOÀN THÀNH ✅
├── frontend/              # Next.js — Port 3005 — CHƯA LÀM
├── infra/
│   ├── docker/            # init-localstack.sh, init-multiple-dbs.sh
│   ├── terraform/         # AWS infra (chưa làm)
│   └── k8s/               # Helm charts (chưa làm)
├── docker-compose.yml
├── README.md
└── CLAUDE.md              # file này
```

## Services đã hoàn thành

### user-service (Port 3001) ✅
**Chức năng**: Auth + quản lý người dùng
**Entities**: User, Address
**Endpoints**:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET/PUT /api/v1/users/me
- GET/POST /api/v1/users/me/addresses

**Đặc điểm quan trọng**:
- passwordHash dùng bcryptjs (không phải bcrypt native)
- Refresh token rotation: mỗi lần refresh cấp cặp mới, revoke token cũ
- Redis lưu jti (JWT ID) để blacklist token khi logout
- SNS publish event `user.registered` → Lambda gửi welcome email qua SES
- Field passwordHash có `select: false` trong TypeORM entity

**Tests**: 17 unit tests pass (auth.service.spec.ts, users.service.spec.ts)

### product-service (Port 3002) ✅
**Chức năng**: Catalog sản phẩm + upload ảnh S3
**Entities**: Product, Category (self-referential tree)
**Endpoints**:
- GET /api/v1/products (search, filter, paginate)
- GET /api/v1/products/:slug
- POST/PUT/DELETE /api/v1/products (admin only)
- POST /api/v1/products/:id/images (upload S3)
- DELETE /api/v1/products/:id/images/:key
- GET /api/v1/categories (flat list)
- GET /api/v1/categories/tree (nested tree)
- POST /api/v1/products/:id/stock/decrement (internal, gọi từ Order Service)

**Đặc điểm quan trọng**:
- Price dùng BIGINT (VND, không decimal)
- Images lưu JSONB trong product: `[{key, url, isThumbnail}]`
- Soft delete: isActive = false thay vì xoá cứng
- Full-text search: DB trigger tự cập nhật tsvector, GIN index
- Migration: `1700000000000-CreateProductsCategoriesFts.ts` tạo extension unaccent, pg_trgm, text search config `vietnamese_unaccent`, trigger và GIN index
- Distributed JWT: verify signature bằng shared JWT_ACCESS_SECRET, KHÔNG gọi User Service
- S3 upload: LocalStack local (endpoint override), AWS thật khi production

**Tests**: 12 unit tests pass (products.service.spec.ts)

### order-service (Port 3003) ✅
**Chức năng**: Cart + Checkout + Quản lý đơn hàng
**Entities**: Order, OrderItem
**DB**: order_db (PostgreSQL schema riêng)

**Endpoints**:
- POST /api/v1/cart — thêm item vào giỏ (Redis)
- GET /api/v1/cart — xem giỏ
- DELETE /api/v1/cart/:productId — xóa item
- DELETE /api/v1/cart — clear giỏ
- POST /api/v1/orders/checkout — tạo đơn hàng
- GET /api/v1/orders — list đơn hàng user (paginated, filters)
- GET /api/v1/orders/:id — chi tiết đơn hàng
- PATCH /api/v1/orders/:id/status — cập nhật status (admin only)

**Luồng Checkout**:
1. Verify JWT token
2. Gọi Product Service GET /products/{id} — verify giá + stock
3. Gọi Product Service POST /products/{id}/stock/decrement — giảm inventory
4. Tạo Order record (status=pending)
5. Tạo OrderItem records (snapshot giá/tên lúc mua)
6. Publish SQS queue `order-created` {orderId, userId, totalAmount}
7. Clear cart từ Redis
8. Trả về Order + Items

**Đặc điểm quan trọng**:
- Cart lưu Redis với key `cart:{userId}`, TTL 7 ngày
- OrderItem snapshot giá + tên tại thời điểm mua (không JOIN lại Product)
- Gọi Product Service để verify + decrement stock (distributed pattern)
- Publish SQS event cho Payment Service consume asynchronously
- Admin guard cho endpoint update status
- Distributed JWT: verify signature bằng shared JWT_ACCESS_SECRET

**Tests**: 12 unit tests pass (cart.service.spec.ts, orders.service.spec.ts)

**Documentation**: 
- README.md — complete service guide
- TESTING.md — comprehensive testing instructions
- IMPLEMENTATION_SUMMARY.md — detailed implementation notes
- Jenkinsfile — CI/CD pipeline



### payment-service (Port 3004) ✅
**Chức năng**: Xử lý thanh toán VNPay/MoMo (demo/fake) + webhook
**Entities**: Transaction, PaymentLog
**DB**: payment_db
**Đặc điểm quan trọng**:
- Fake QR code base64 (thư viện `qrcode`) + fake VNPay URL cho demo
- SQS Consumer (`SqsConsumerService`) tự động poll `order-created` queue, tạo Transaction pending
- PaymentLog audit trail ghi nhận mọi sự kiện (7 loại event)
- POST /payments/auto-approve/:ref — duyệt thanh toán ngay không cần scan QR (demo)
- Publish SNS `order.paid` sau khi thanh toán thành công
- `CommonModule` dùng `@Global()` để JwtAuthGuard available toàn app
**Tests**: 14 unit tests pass (payments.service.spec.ts)

### api-gateway (Port 3000) ✅
**Chức năng**: Single entry point, routing, JWT validation, rate limiting
**Không có DB**
**Route map**:
- /api/v1/auth/* → user-service:3001
- /api/v1/users/* → user-service:3001
- /api/v1/products/* → product-service:3002
- /api/v1/categories/* → product-service:3002
- /api/v1/cart/* → order-service:3003
- /api/v1/orders/* → order-service:3003
- /api/v1/payments/* → payment-service:3004
**Đặc điểm quan trọng**:
- JWT validation tại Express-level middleware (trước proxy, sau đó downstream không cần validate lại)
- Forward user info (`x-user-id`, `x-user-email`, `x-user-role`) sang downstream qua internal headers
- Rate limiting: 200 req/15min tổng, 20 req/15min cho auth/login và auth/register (chống brute-force)
- Public routes không cần JWT: GET /products/*, GET /categories/*, POST /auth/(register|login|refresh), POST /payments/callback
- `http-proxy-middleware` v3 + `express-rate-limit` v7
- Error handler: trả 503 khi downstream không khả dụng


### frontend (Port 3005) ✅
**Stack**: Next.js 14 (App Router), TailwindCSS, TypeScript
**Gọi API**: Luôn qua api-gateway:3000, không gọi trực tiếp vào service
**Pages**:
- `/` — Homepage SSR, featured products ISR 60s
- `/products` — Product listing với search, filter category, paginate (SSR)
- `/products/[slug]` — Product detail client component (fetch qua API)
- `/cart` — Giỏ hàng (client, CartContext + localStorage)
- `/checkout` — Đặt hàng (form địa chỉ + phương thức thanh toán)
- `/checkout/payment` — Trang QR code thanh toán demo
- `/payment-callback` — Kết quả thanh toán
- `/orders` — Lịch sử đơn hàng (protected)
- `/orders/[id]` — Chi tiết đơn hàng (protected)
- `/login`, `/register` — Auth forms
- `/profile` — Thông tin cá nhân
**Đặc điểm quan trọng**:
- AuthContext: JWT lưu localStorage, auto-refresh 401, `register()` + `setUser()` exposed
- CartContext: `ecom_cart` localStorage persistence
- API_URL (server-side SSR) vs NEXT_PUBLIC_API_URL (client-side browser)
- QR code hiển thị dưới dạng base64 `<img>` (từ payment-service)
- "Auto approve" button gọi `POST /payments/auto-approve/:ref` để demo thanh toán
- Docker: development target (npm run dev), production target (next build)

## Database design

### Quy tắc chung
- UUID cho tất cả primary key (gen_random_uuid())
- TIMESTAMPTZ cho timestamps
- BIGINT cho giá tiền VND (không float)
- Mỗi service có schema/database riêng, KHÔNG cross-join giữa services

### Schema quan trọng — Order Service
```sql
-- orders
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,  -- Không FK vì cross-service
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_amount     BIGINT NOT NULL,
  shipping_address JSONB NOT NULL,  -- Snapshot địa chỉ lúc đặt hàng
  payment_method   VARCHAR(20),     -- vnpay, momo, cod
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- order_items (snapshot giá, không JOIN lại Product)
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id),
  product_id   UUID NOT NULL,    -- Không FK vì cross-service
  product_name VARCHAR(255) NOT NULL,  -- Snapshot tên
  product_slug VARCHAR(300),           -- Để link sản phẩm
  unit_price   BIGINT NOT NULL,        -- Snapshot giá lúc mua
  quantity     INTEGER NOT NULL CHECK (quantity > 0)
);
```

## AWS Services & quyết định cost

| Service AWS | Quyết định | Lý do |
|-------------|-----------|-------|
| Aurora | ❌ Dùng RDS PostgreSQL | Aurora không có free tier |
| ElastiCache | ❌ Redis pod trong EKS | Tiết kiệm $12/tháng |
| OpenSearch | ❌ PostgreSQL FTS | Tiết kiệm $25/tháng, đủ cho 1000 sản phẩm |
| Cognito | ❌ JWT tự build | Học được nhiều hơn, ít config phức tạp |
| EKS | ✅ Dùng, 1 cluster | Bắt buộc vì đồ án DevSecOps |
| Lambda | ✅ Dùng | Free tier 1M invocations |
| S3 + CloudFront | ✅ Dùng | Gần free với traffic nhỏ |
| SQS + SNS | ✅ Dùng | Free tier 1M requests |
| SES | ✅ Dùng | 62k email free/tháng |
| API Gateway | ✅ Dùng HTTP API | Rẻ hơn REST API 70% |
| Secrets Manager | ✅ Dùng | Bắt buộc cho DevSecOps |

## Môi trường

- **Dev/Test**: Chung 1 EKS cluster, namespace riêng, nhánh `develop` auto deploy
- **Production**: EKS cluster riêng, nhánh `main` + manual approval trên ArgoCD
- **Local**: Docker Compose + LocalStack, `docker compose up -d` là chạy được hết

## Patterns đang dùng

- **GitOps**: manifest update trong Jenkinsfile sau khi push ECR → ArgoCD tự sync
- **Distributed JWT**: Mỗi service tự verify JWT bằng shared secret, không gọi User Service
- **Async messaging**: SQS giữa Order → Payment để decoupling
- **Snapshot pattern**: Lưu giá + tên sản phẩm vào OrderItem tại thời điểm mua
- **Soft delete**: isActive = false cho sản phẩm, không hard delete
- **SELECT FOR UPDATE**: Dùng khi decrement stock để tránh race condition

## Convention code

- Tất cả comment bằng tiếng Việt
- Error message bằng tiếng Việt
- File spec đặt cùng thư mục với file được test (*.spec.ts)
- DTO dùng class-validator với message tiếng Việt
- Controller endpoint tiếng Anh (RESTful)
- Config load từ ConfigService, KHÔNG hardcode
- Secret KHÔNG bao giờ commit vào code — dùng .env.example làm template
