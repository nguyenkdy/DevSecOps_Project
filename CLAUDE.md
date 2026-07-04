# Project Context — E-commerce Microservices

> File này là "bộ nhớ" cho Claude Code trong VSCode.
> Đặt ở root project, Claude Code sẽ tự đọc khi bắt đầu session.

## Tổng quan project

Đồ án DevSecOps — E-commerce platform theo kiến trúc microservices, deploy trên AWS với pipeline Jenkins CI → ArgoCD CD → EKS. Project cấp sinh viên nhưng thiết kế gần thực tế nhất có thể.

## Tech stack

- **Backend**: NestJS 11 (TypeScript 5.8), TypeORM 0.3.x, PostgreSQL 17
- **Runtime**: Node.js 22 LTS (Docker image: node:22-alpine)
- **Auth**: JWT tự build (access 15 phút + refresh 7 ngày với rotation)
- **Cache/Session**: Redis 8 (tự deploy trong EKS pod, không dùng ElastiCache)
- **Async messaging**: AWS SDK v3 (3.750+) — SQS + SNS
- **Storage**: AWS S3 + CloudFront CDN
- **Serverless**: AWS Lambda (payment webhook, image resize, email)
- **Email**: AWS SES
- **Search**: PostgreSQL FTS (pg_trgm + unaccent) — thay OpenSearch để tiết kiệm cost
- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS 3.4
- **CI**: Jenkins (Jenkinsfile trong từng service)
- **CD**: ArgoCD + Helm charts
- **Infra**: Terraform, AWS EKS
- **Security**: SonarQube, Trivy, AWS Secrets Manager + External Secrets Operator
- **Local dev**: Docker Compose + LocalStack 3.4 (giả lập S3/SQS/SNS/SES)

## Cấu trúc monorepo

```
ecommerce/
├── services/
│   ├── user-service/      # Port 3001 — HOÀN THÀNH ✅
│   ├── product-service/   # Port 3002 — HOÀN THÀNH ✅
│   ├── order-service/     # Port 3003 — HOÀN THÀNH ✅
│   ├── payment-service/   # Port 3004 — HOÀN THÀNH ✅
│   └── api-gateway/       # Port 3000 — HOÀN THÀNH ✅
├── frontend/              # Next.js 15 — Port 3005 — HOÀN THÀNH ✅
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
- PATCH /api/v1/users/me/addresses/:id
- DELETE /api/v1/users/me/addresses/:id

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
**Stack**: Next.js 15 (App Router), React 19, TailwindCSS 3.4, TypeScript 5.8
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
- `/profile` — Thông tin cá nhân + quản lý địa chỉ giao hàng (thêm/sửa/xóa/đặt mặc định) + ví EcomPay
**Đặc điểm quan trọng**:
- AuthContext: JWT lưu localStorage, auto-refresh 401, `register()` + `setUser()` exposed
- CartContext: `ecom_cart` localStorage persistence
- API_URL (server-side SSR) vs NEXT_PUBLIC_API_URL (client-side browser)
- QR code hiển thị dưới dạng base64 `<img>` (từ payment-service)
- "Auto approve" button gọi `POST /payments/auto-approve/:ref` để demo thanh toán
- Docker: development target (npm run dev), production target (next build)
- **Next.js 15 breaking change**: `searchParams` trong server components là `Promise<SearchParams>` — phải `await` trước khi dùng
- Checkout auto-fill địa chỉ từ danh sách địa chỉ đã lưu trong profile
- `addressesApi` trong `lib/api.ts`: list/create/update/delete địa chỉ
- `walletApi` trong `lib/api.ts`: getBalance + topUp (EcomPay demo)

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

- **Production** ✅: EKS cluster `ecommerce-eks` ap-southeast-1, namespace `ecommerce`, nhánh `main`
- **Dev/Test** ✅: Cùng EKS cluster, namespace `ecommerce-dev`, nhánh `develop` auto deploy
- **Local**: Docker Compose + LocalStack, `docker compose up -d` là chạy được hết
- **Argo Rollouts** ✅: v1.9.0 cài trong namespace `argo-rollouts` — frontend dùng canary strategy (setWeight:40, pause)

## Hạ tầng & Vận hành

### Endpoints

| | Production | Dev |
|--|------------|-----|
| **Frontend** | http://k8s-ecommerc-frontend-74bcefc5c8-1434814566.ap-southeast-1.elb.amazonaws.com | http://k8s-ecommerc-frontend-098809d8ea-1169492521.ap-southeast-1.elb.amazonaws.com |
| **API Gateway** | http://k8s-ecommerc-apigatew-bac50f6700-1615445116.ap-southeast-1.elb.amazonaws.com | http://k8s-ecommerc-apigatew-afc7d5cc0d-1740156965.ap-southeast-1.elb.amazonaws.com |
| **ArgoCD** | http://a5909144139e1478b97145fd2f27661c-372496131.ap-southeast-1.elb.amazonaws.com | — |

> **Lưu ý**: ALB URL thay đổi mỗi khi terraform destroy+apply. Cần cập nhật lại `CORS_ORIGIN` (api-gateway values.yaml) và `NEXT_PUBLIC_API_URL` (frontend values.yaml) rồi trigger Jenkins rebuild frontend.

### Infrastructure

- **AWS Account**: `715923838470` — Region `ap-southeast-1`
- **EKS Cluster**: `ecommerce-eks`
- **EKS Node Group**: `ecommerce-nodes-20260702035012697100000020` (t3.medium On-Demand × 2)
- **Namespace prod**: `ecommerce` | **Namespace dev**: `ecommerce-dev`
- **RDS**: `ecommerce-postgres.c7gyqes8qujb.ap-southeast-1.rds.amazonaws.com` (PostgreSQL 17, db.t3.micro)
- **RDS credentials**: `postgres` / `this_is_my_strong_password`
- **S3 Bucket**: `ecommerce-product-images-715923838470`
- **CloudFront**: `https://d1q28g8lb2x75x.cloudfront.net`
- **ECR**: `715923838470.dkr.ecr.ap-southeast-1.amazonaws.com/{service}`
- **Jenkins EC2**: IP động — lấy từ AWS Console (chưa có Elastic IP)

### Databases

| Database | Namespace |
|----------|-----------|
| `user_db`, `product_db`, `order_db`, `payment_db` | ecommerce (production) |
| `user_db_dev`, `product_db_dev`, `order_db_dev`, `payment_db_dev` | ecommerce-dev |

### Tắt / Bật môi trường (tiết kiệm chi phí)

```bash
# --- TẮT ---
# Stop RDS (tối đa 7 ngày AWS tự start lại)
aws rds stop-db-instance --db-instance-identifier ecommerce-postgres --region ap-southeast-1
# Scale EKS nodes về 0
aws eks update-nodegroup-config \
  --cluster-name ecommerce-eks \
  --nodegroup-name ecommerce-nodes-20260702035012697100000020 \
  --scaling-config minSize=0,maxSize=2,desiredSize=0 \
  --region ap-southeast-1

# --- BẬT LẠI ---
# 1. Start RDS trước (~3-5 phút)
aws rds start-db-instance --db-instance-identifier ecommerce-postgres --region ap-southeast-1
# 2. Scale nodes lên (chờ RDS available xong mới làm)
aws eks update-nodegroup-config \
  --cluster-name ecommerce-eks \
  --nodegroup-name ecommerce-nodes-20260702035012697100000020 \
  --scaling-config minSize=1,maxSize=2,desiredSize=2 \
  --region ap-southeast-1
# 3. Cập nhật kubeconfig
aws eks update-kubeconfig --name ecommerce-eks --region ap-southeast-1
# 4. ArgoCD tự deploy lại tất cả pods (~3-5 phút sau khi nodes ready)
kubectl get pods -n ecommerce && kubectl get pods -n ecommerce-dev
```

> Vẫn tốn phí khi tắt: EKS control plane (~$2.4/ngày) + NAT Gateway (~$1/ngày)

### K8s Secrets (phải tạo thủ công — không có trong code)

```bash
# Production — tạo secret cho từng service (ví dụ user-service)
kubectl create secret generic user-service-secret -n ecommerce \
  --from-literal=DATABASE_PASSWORD=this_is_my_strong_password \
  --from-literal=JWT_ACCESS_SECRET=<32-byte-hex> \
  --from-literal=JWT_REFRESH_SECRET=<32-byte-hex>

# Dev — copy từ prod, đổi tên thành {svc}-dev-secret (Helm release name = {svc}-dev)
for svc in user-service order-service payment-service product-service api-gateway; do
  kubectl get secret ${svc}-secret -n ecommerce -o json \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
d['metadata'] = {'name': '${svc}-dev-secret', 'namespace': 'ecommerce-dev'}
print(json.dumps(d))
" | kubectl apply -f -
done
```

> **Tại sao tên khác nhau?** Helm release tên `order-service-dev` → pod expect secret `order-service-dev-secret`. Nếu tên sai, `optional: true` trong secretRef khiến pod start mà không có DATABASE_PASSWORD → lỗi auth DB.

### Canary Deployment (frontend)

```bash
# Xem trạng thái rollout
kubectl argo rollouts get rollout frontend -n ecommerce --watch

# Promote sau khi verify canary OK
kubectl argo rollouts promote frontend -n ecommerce

# Rollback nếu có vấn đề
kubectl argo rollouts abort frontend -n ecommerce
kubectl argo rollouts undo frontend -n ecommerce
```

> **Lưu ý canary + Next.js**: ALB sticky sessions (`stickiness.lb_cookie`) được bật để tránh CSS hash mismatch giữa canary pod (build mới) và stable pods (build cũ). Browser bị ghim vào 1 pod — cần xóa cookie `AWSALB` hoặc dùng cửa sổ ẩn danh mới để test pod khác.

### Rebuild từ đầu (sau terraform destroy+apply)

```bash
# 1. AWS Load Balancer Controller
eksctl utils associate-iam-oidc-provider --cluster ecommerce-eks --approve --region ap-southeast-1
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system --set clusterName=ecommerce-eks \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::715923838470:role/AmazonEKSLoadBalancerControllerRole

# 2. ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2b. Argo Rollouts (cần cho frontend canary)
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
# Cài kubectl plugin
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64 && sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# 3. Tạo namespaces + secrets (xem mục K8s Secrets bên trên)

# 4. Apply ArgoCD apps
kubectl apply -f infra/k8s/argocd-apps.yaml
kubectl apply -f infra/k8s/argocd-apps-dev.yaml

# 5. Tạo databases (RDS trong private VPC — phải chạy từ pod trong cluster)
kubectl run psql-tmp --rm -it --image=postgres:17-alpine --restart=Never -n ecommerce \
  --env="PGPASSWORD=this_is_my_strong_password" \
  -- psql -h ecommerce-postgres.c7gyqes8qujb.ap-southeast-1.rds.amazonaws.com \
  -U postgres -d postgres \
  -c "CREATE DATABASE user_db" -c "CREATE DATABASE product_db" \
  -c "CREATE DATABASE order_db" -c "CREATE DATABASE payment_db" \
  -c "CREATE DATABASE user_db_dev" -c "CREATE DATABASE product_db_dev" \
  -c "CREATE DATABASE order_db_dev" -c "CREATE DATABASE payment_db_dev"

# 6. Migrations production
for svc in user-service product-service order-service payment-service; do
  kubectl exec -n ecommerce deployment/$svc -- npm run migration:run:prod
done

# 7. Cập nhật ALB URLs mới vào values.yaml, values.dev.yaml rồi trigger Jenkins rebuild frontend
```

### Fixes quan trọng đã áp dụng (không có trong code gốc)

- `S3_MEDIA_BUCKET` env var (values.yaml cũ dùng `S3_BUCKET_NAME` sai tên)
- `CLOUDFRONT_URL` đọc từ env thay vì hardcode `cdn.yourdomain.com`
- `CORS_ORIGIN` configurable trong api-gateway cho môi trường production
- Migration dùng compiled JS `dist/` (`migration:run:prod`) thay TypeScript source
- Xóa `ACL: 'public-read'` trong S3 PutObject (bucket mới AWS không hỗ trợ ACL)
- `unoptimized: true` trong Next.js Image (CloudFront lo CDN, không cần Next.js proxy)
- `imagePullPolicy: Always` trong tất cả Helm deployments
- `NODE_ENV: production` trong backend `values.dev.yaml` — RDS PostgreSQL 17 bắt buộc SSL, TypeORM chỉ enable SSL khi `NODE_ENV === 'production'`
- K8s secret dev phải tên `{svc}-dev-secret` (không phải `{svc}-secret`) vì Helm release name là `{svc}-dev`
- api-gateway-dev cần override URL service: `USER_SERVICE_URL: http://user-service-dev:3001` (không phải `user-service`)
- Jenkins git push dùng `git push origin HEAD:develop` (không phải `git push origin develop`) vì checkout tạo detached HEAD
- Jenkins `currentBuild.changeSets` thay `git diff HEAD~1 HEAD` — tránh false positive khi merge commit
- Frontend Dockerfile: `RUN chown -R node:node /app` trước `USER node` — fix `EACCES: permission denied /app/.next/cache`
- Frontend Jenkinsfile: `docker builder prune -f` trước Trivy build — tránh `no space left on device` trên Jenkins EC2
- Frontend SonarQube: `-Dsonar.coverage.exclusions=**/*` — frontend không có tests, loại khỏi coverage gate
- ALB sticky sessions cho frontend Ingress: `stickiness.lb_cookie.duration_seconds=86400` — tránh CSS hash mismatch khi canary

## Roadmap

### Đã hoàn thành
- ✅ 6 microservices + frontend Next.js 15
- ✅ Docker Compose + LocalStack local dev
- ✅ Terraform: VPC, EKS, RDS, S3, CloudFront, SQS, SNS, IAM IRSA
- ✅ Helm charts + ArgoCD GitOps (prod + dev namespace)
- ✅ Jenkins CI: Lint → Test → SonarQube → Trivy → ECR → GitOps
- ✅ Dev environment: namespace `ecommerce-dev`, nhánh `develop`, Multibranch Pipeline
- ✅ Address management (user-service + frontend profile + checkout auto-fill)
- ✅ Canary deployment với Argo Rollouts v1.9.0 (frontend, setWeight:40)

### Đang làm tiếp theo
1. **HTTPS/TLS**: ACM certificate + HTTPS listener trên ALB
2. **AWS Secrets Manager + ESO**: thay plain-text password trong ConfigMap/Secret
3. **Fix Jenkins/SonarQube**: Elastic IP cho EC2, dùng `localhost:9000` thay IP động
4. **CloudWatch Container Insights + AWS X-Ray**: metrics/logs EKS + distributed tracing với ADOT collector

## Patterns đang dùng

- **GitOps**: manifest update trong Jenkinsfile sau khi push ECR → ArgoCD tự sync
- **Distributed JWT**: Mỗi service tự verify JWT bằng shared secret, không gọi User Service
- **Async messaging**: SQS giữa Order → Payment để decoupling
- **Snapshot pattern**: Lưu giá + tên sản phẩm vào OrderItem tại thời điểm mua
- **Soft delete**: isActive = false cho sản phẩm, không hard delete
- **SELECT FOR UPDATE**: Dùng khi decrement stock để tránh race condition
- **Canary deployment**: Argo Rollouts `setWeight:40` + `pause:{}` cho frontend — 1 canary pod / 2 stable pods, ALB sticky sessions đảm bảo consistency per user

## Convention code

- Tất cả comment bằng tiếng Việt
- Error message bằng tiếng Việt
- File spec đặt cùng thư mục với file được test (*.spec.ts)
- DTO dùng class-validator với message tiếng Việt
- Controller endpoint tiếng Anh (RESTful)
- Config load từ ConfigService, KHÔNG hardcode
- Secret KHÔNG bao giờ commit vào code — dùng .env.example làm template
