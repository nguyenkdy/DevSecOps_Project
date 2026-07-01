#!/bin/bash
set -e

API="http://k8s-ecommerc-apigatew-bac50f6700-113943684.ap-southeast-1.elb.amazonaws.com/api/v1"
DB_HOST="ecommerce-postgres.c7gyqes8qujb.ap-southeast-1.rds.amazonaws.com"
DB_PASS="this_is_my_strong_password"
ADMIN_EMAIL="nguyenkhanhduy20050616@gmail.com"
ADMIN_PASSWORD="Duy200506"

echo ""
echo "======================================================"
echo " EcomShop — Seed dữ liệu sản phẩm"
echo "======================================================"

# ── 1. Set admin role ────────────────────────────────────
echo ""
echo "[1/5] Cấp quyền admin cho $ADMIN_EMAIL ..."

kubectl run set-admin --image=postgres:17 -n ecommerce --restart=Never \
  --env="PGPASSWORD=$DB_PASS" \
  -- psql -h "$DB_HOST" -U postgres -d user_db \
  -c "UPDATE users SET role = 'admin' WHERE email = '$ADMIN_EMAIL' RETURNING email, role;" \
  2>/dev/null || true

sleep 8
kubectl logs set-admin -n ecommerce 2>/dev/null || true
kubectl delete pod set-admin -n ecommerce 2>/dev/null || true

# ── 2. Login ─────────────────────────────────────────────
echo ""
echo "[2/5] Đăng nhập ..."

LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Lỗi đăng nhập: $LOGIN"
  exit 1
fi
echo "Đăng nhập thành công!"

# ── 3. Tạo categories ────────────────────────────────────
echo ""
echo "[3/5] Tạo danh mục ..."

CAT_PHONE=$(curl -s -X POST "$API/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Điện thoại"}' | jq -r '.id')
echo "  ✓ Điện thoại: $CAT_PHONE"

CAT_LAPTOP=$(curl -s -X POST "$API/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop"}' | jq -r '.id')
echo "  ✓ Laptop: $CAT_LAPTOP"

CAT_ACC=$(curl -s -X POST "$API/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Phụ kiện"}' | jq -r '.id')
echo "  ✓ Phụ kiện: $CAT_ACC"

# ── 4. Helper function ───────────────────────────────────
create_product() {
  local NAME="$1"
  local PRICE="$2"
  local STOCK="$3"
  local CAT_ID="$4"
  local DESC="$5"
  local IMG_SEED="$6"

  PRODUCT=$(curl -s -X POST "$API/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"price\":$PRICE,\"stockQty\":$STOCK,\"categoryId\":\"$CAT_ID\",\"description\":\"$DESC\"}")
  PRODUCT_ID=$(echo "$PRODUCT" | jq -r '.id')

  if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
    echo "  ✗ Lỗi tạo $NAME: $PRODUCT"
    return
  fi

  # Tải ảnh placeholder và upload lên S3
  IMG_FILE="/tmp/product_${IMG_SEED}.jpg"
  curl -sL "https://picsum.photos/seed/${IMG_SEED}/800/800" -o "$IMG_FILE"

  curl -s -X POST "$API/products/$PRODUCT_ID/images" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$IMG_FILE" > /dev/null

  echo "  ✓ $NAME (${PRICE} VND, stock: $STOCK)"
  rm -f "$IMG_FILE"
}

# ── 5. Tạo sản phẩm ──────────────────────────────────────
echo ""
echo "[4/5] Tạo sản phẩm ..."

echo ""
echo "  --- Điện thoại ---"

create_product \
  "iPhone 15 Pro Max 256GB" \
  33990000 50 "$CAT_PHONE" \
  "iPhone 15 Pro Max với chip A17 Pro mạnh mẽ nhất từ trước đến nay, camera 48MP thế hệ mới với khả năng zoom quang học 5x, màn hình Super Retina XDR 6.7 inch ProMotion 120Hz. Thiết kế khung titan siêu bền, cổng USB-C tốc độ cao, Action Button tùy chỉnh. Dung lượng pin lớn sử dụng cả ngày dài." \
  "iphone15pro"

create_product \
  "Samsung Galaxy S24 Ultra 512GB" \
  29990000 35 "$CAT_PHONE" \
  "Samsung Galaxy S24 Ultra trang bị bút S Pen tích hợp, màn hình Dynamic AMOLED 2X 6.8 inch 120Hz, chip Snapdragon 8 Gen 3 for Galaxy, camera 200MP với AI ProVisual Engine. RAM 12GB, bộ nhớ 512GB, pin 5000mAh sạc nhanh 45W. Khung Titanium Grade 4 sang trọng và bền bỉ." \
  "samsung-s24"

create_product \
  "OPPO Find X7 Pro 256GB" \
  19990000 40 "$CAT_PHONE" \
  "OPPO Find X7 Pro sở hữu hệ thống camera Hasselblad chuyên nghiệp với cảm biến Sony LYT-900 1 inch, màn hình AMOLED 6.82 inch 120Hz, chip Dimensity 9300 hàng đầu. Sạc nhanh 100W SuperVOOC, sạc không dây 50W, pin 5000mAh. Thiết kế mặt lưng da Vegan cao cấp." \
  "oppo-findx7"

create_product \
  "Xiaomi 14 Ultra 512GB" \
  24990000 30 "$CAT_PHONE" \
  "Xiaomi 14 Ultra với hệ thống camera Leica Summilux đỉnh cao, cảm biến 1 inch IMX989, khẩu độ f/1.63 có thể điều chỉnh. Màn hình AMOLED 6.73 inch 120Hz, chip Snapdragon 8 Gen 3, RAM 16GB. Sạc siêu nhanh 90W có dây và 80W không dây, pin 5000mAh." \
  "xiaomi14ultra"

echo ""
echo "  --- Laptop ---"

create_product \
  "MacBook Air M3 13 inch 16GB/512GB" \
  28990000 20 "$CAT_LAPTOP" \
  "MacBook Air M3 với chip Apple M3 cực kỳ mạnh mẽ và tiết kiệm điện, màn hình Liquid Retina 13.6 inch sRGB rực rỡ, thời lượng pin lên tới 18 tiếng. Thiết kế mỏng nhẹ chỉ 1.24kg, không quạt hoàn toàn yên tĩnh. RAM Unified 16GB, SSD 512GB tốc độ cao. Hỗ trợ Thunderbolt 3, MagSafe 3, Wi-Fi 6E." \
  "macbook-air-m3"

create_product \
  "Dell XPS 15 9530 RTX 4060" \
  45990000 15 "$CAT_LAPTOP" \
  "Dell XPS 15 9530 là laptop cao cấp nhất của Dell, trang bị Intel Core i9-13900H 24 nhân, NVIDIA GeForce RTX 4060 8GB, màn hình OLED 3.5K 120Hz rực rỡ. RAM 32GB DDR5, SSD 1TB NVMe PCIe 4.0. Thiết kế CNC Aluminum siêu mỏng, bàn phím có đèn nền, cảm biến vân tay tích hợp." \
  "dell-xps15"

create_product \
  "ASUS ZenBook 14 OLED 2024" \
  21990000 25 "$CAT_LAPTOP" \
  "ASUS ZenBook 14 OLED với màn hình OLED 2.8K 120Hz độ chính xác màu sắc DCI-P3 100%, chip Intel Core Ultra 7 155H, RAM 32GB LPDDR5, SSD 1TB. Trọng lượng chỉ 1.2kg, pin 75Wh sạc nhanh 65W. Bàn phím ErgoSense thoải mái, webcam AI 1080p, cổng kết nối đa dạng." \
  "asus-zenbook14"

create_product \
  "Lenovo ThinkPad X1 Carbon Gen 12" \
  38990000 12 "$CAT_LAPTOP" \
  "ThinkPad X1 Carbon Gen 12 — laptop doanh nhân đỉnh cao với Intel Core Ultra 7 165U, RAM 32GB LPDDR5, SSD 1TB. Màn hình IPS 14 inch 2.8K, chứng nhận MIL-SPEC 810H cực bền. Trọng lượng chỉ 1.12kg, pin 57Wh siêu bền, bảo mật vật lý ThinkShutter, bàn phím huyền thoại của ThinkPad." \
  "thinkpad-x1"

echo ""
echo "  --- Phụ kiện ---"

create_product \
  "Apple AirPods Pro Gen 2" \
  6990000 100 "$CAT_ACC" \
  "AirPods Pro thế hệ 2 với chip H2 mới, chống ồn chủ động ANC mạnh hơn 2 lần so với thế hệ trước, Transparency mode nâng cao. Âm thanh Spatial Audio cá nhân hóa, kháng nước IPX4. Hộp sạc MagSafe mới có loa, sạc bằng Apple Watch. Thời lượng pin 6 tiếng (30 tiếng với hộp sạc)." \
  "airpods-pro2"

create_product \
  "Logitech MX Master 3S" \
  2290000 80 "$CAT_ACC" \
  "Chuột Logitech MX Master 3S với cảm biến quang học 8000 DPI chính xác tuyệt đối trên mọi bề mặt kể cả kính. Cuộn bánh xe MagSpeed điện từ siêu nhanh, 7 nút tùy chỉnh, kết nối Logi Bolt USB hoặc Bluetooth. Sạc USB-C, pin 70 ngày. Hỗ trợ Flow — điều khiển đa máy tính." \
  "mx-master3s"

create_product \
  "Samsung 27 inch OLED Monitor S90PC" \
  18990000 10 "$CAT_ACC" \
  "Màn hình Samsung OLED 27 inch QHD 2560x1440 với tấm nền OLED độ tương phản vô cực, màu đen tuyệt đối, độ chính xác màu DCI-P3 99%. Tần số quét 240Hz, thời gian phản hồi 0.03ms cho gaming và đồ họa chuyên nghiệp. Cổng HDMI 2.1, DisplayPort 1.4, USB-C 90W, tích hợp KVM switch." \
  "samsung-oled-monitor"

create_product \
  "Keychron K2 Pro Mechanical Keyboard" \
  2890000 60 "$CAT_ACC" \
  "Bàn phím cơ Keychron K2 Pro layout 75% compact, switch Gateron G Pro có thể thay hot-swap, đèn nền RGB per-key rực rỡ. Kết nối Bluetooth 5.1 đa thiết bị (3 thiết bị) hoặc USB-C có dây. Tương thích Windows/Mac, keycap PBT doubleshot bền màu, mạch PCB QMK/VIA tùy chỉnh firmware." \
  "keychron-k2"

create_product \
  "Anker 737 GaNPrime 120W Charger" \
  1590000 150 "$CAT_ACC" \
  "Sạc Anker 737 GaNPrime công suất 120W với 2 cổng USB-C và 1 USB-A, công nghệ GaN thế hệ 3 nhỏ gọn hơn 40% so với sạc thông thường. Sạc 1 thiết bị 120W, 2 thiết bị 65W+45W. Tương thích MacBook Pro, iPad Pro, iPhone, Android. Chứng nhận tương thích với hơn 100 thiết bị." \
  "anker-charger"

# ── Hoàn thành ────────────────────────────────────────────
echo ""
echo "[5/5] Hoàn thành!"
echo ""
echo "======================================================"
echo " Tổng kết:"
echo "   - 3 danh mục: Điện thoại, Laptop, Phụ kiện"
echo "   - 13 sản phẩm với ảnh và mô tả đầy đủ"
echo "   - Admin: $ADMIN_EMAIL"
echo "======================================================"
echo ""
echo "Truy cập web:"
echo "  http://k8s-ecommerc-frontend-74bcefc5c8-982823328.ap-southeast-1.elb.amazonaws.com"
echo ""
