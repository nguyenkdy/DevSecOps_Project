-- Seed dữ liệu: Categories + Products
-- Chạy: docker compose exec -T postgres psql -U postgres -d product_db < infra/docker/seed-products.sql

-- Xóa data cũ nếu có (idempotent)
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;

-- ─── ROOT CATEGORIES ──────────────────────────────────────────────────────────
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Thời trang',             'thoi-trang',          1),
  ('Điện tử',                'dien-tu',             2),
  ('Nhà cửa & Đời sống',     'nha-cua-doi-song',    3),
  ('Thể thao & Dã ngoại',    'the-thao-da-ngoai',   4),
  ('Sách & Văn phòng phẩm',  'sach-van-phong-pham', 5),
  ('Mỹ phẩm & Chăm sóc',    'my-pham-cham-soc',    6),
  ('Thực phẩm & Đồ uống',    'thuc-pham-do-uong',   7);

-- ─── SUB CATEGORIES ───────────────────────────────────────────────────────────
INSERT INTO categories (parent_id, name, slug, sort_order)
SELECT id, 'Áo nam',              'ao-nam',               1 FROM categories WHERE slug = 'thoi-trang' UNION ALL
SELECT id, 'Áo nữ',              'ao-nu',                2 FROM categories WHERE slug = 'thoi-trang' UNION ALL
SELECT id, 'Quần nam',           'quan-nam',             3 FROM categories WHERE slug = 'thoi-trang' UNION ALL
SELECT id, 'Quần nữ',            'quan-nu',              4 FROM categories WHERE slug = 'thoi-trang' UNION ALL
SELECT id, 'Giày dép',           'giay-dep',             5 FROM categories WHERE slug = 'thoi-trang' UNION ALL
SELECT id, 'Túi xách & Ví',      'tui-xach-vi',          6 FROM categories WHERE slug = 'thoi-trang';

INSERT INTO categories (parent_id, name, slug, sort_order)
SELECT id, 'Điện thoại',          'dien-thoai',           1 FROM categories WHERE slug = 'dien-tu' UNION ALL
SELECT id, 'Laptop',              'laptop',               2 FROM categories WHERE slug = 'dien-tu' UNION ALL
SELECT id, 'Tai nghe',            'tai-nghe',             3 FROM categories WHERE slug = 'dien-tu' UNION ALL
SELECT id, 'Phụ kiện công nghệ', 'phu-kien-cong-nghe',   4 FROM categories WHERE slug = 'dien-tu';

INSERT INTO categories (parent_id, name, slug, sort_order)
SELECT id, 'Đồ dùng nhà bếp',    'do-dung-nha-bep',      1 FROM categories WHERE slug = 'nha-cua-doi-song' UNION ALL
SELECT id, 'Nội thất & Trang trí','noi-that-trang-tri',   2 FROM categories WHERE slug = 'nha-cua-doi-song';

INSERT INTO categories (parent_id, name, slug, sort_order)
SELECT id, 'Dụng cụ thể thao',   'dung-cu-the-thao',     1 FROM categories WHERE slug = 'the-thao-da-ngoai' UNION ALL
SELECT id, 'Quần áo thể thao',   'quan-ao-the-thao',     2 FROM categories WHERE slug = 'the-thao-da-ngoai';

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────

-- ══ ÁO NAM ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Thun Nam Cotton 100% Basic Tee',
  'ao-thun-nam-cotton-basic-tee',
  'Áo thun nam chất liệu cotton 100% cao cấp, thoáng mát, thấm hút mồ hôi tốt. Dáng regular fit phù hợp nhiều vóc dáng. Có 8 màu: trắng, đen, xám, navy, đỏ, xanh lá, be, nâu.',
  179000, 150,
  '[{"key":"demo/ao-thun-1.jpg","url":"https://picsum.photos/seed/aothunnam1/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Polo Nam Cổ Bẻ Slim Fit',
  'ao-polo-nam-co-be-slim-fit',
  'Áo polo nam thiết kế cổ bẻ thanh lịch, chất liệu pique cotton co giãn 4 chiều. Phù hợp đi làm, đi chơi, du lịch.',
  259000, 120,
  '[{"key":"demo/ao-polo.jpg","url":"https://picsum.photos/seed/polo/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Sơ Mi Nam Dài Tay Oxford',
  'ao-so-mi-nam-dai-tay-oxford',
  'Áo sơ mi nam chất liệu oxford cao cấp, form slim fit hiện đại. Phù hợp đi làm văn phòng, hội họp, sự kiện.',
  349000, 80,
  '[{"key":"demo/so-mi.jpg","url":"https://picsum.photos/seed/somi/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Khoác Nam Gió Nhẹ Chống Nắng',
  'ao-khoac-nam-gio-nhe-chong-nang',
  'Áo khoác nam chất liệu gió nhẹ, chống tia UV, có mũ gấp gọn vào túi tiện lợi. Thích hợp đi xe máy, dã ngoại, leo núi.',
  399000, 60,
  '[{"key":"demo/khoac-gio.jpg","url":"https://picsum.photos/seed/khoac/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Hoodie Nam Nỉ Bông Dày',
  'ao-hoodie-nam-ni-bong-day',
  'Áo hoodie nam chất nỉ bông dày dặn, ấm áp. Thiết kế túi kangaroo tiện lợi, dây rút mũ điều chỉnh được. Phù hợp mùa lạnh.',
  449000, 90,
  '[{"key":"demo/hoodie.jpg","url":"https://picsum.photos/seed/hoodie/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Thun Nam In Họa Tiết Streetwear',
  'ao-thun-nam-in-hoa-tiet-streetwear',
  'Áo thun nam in họa tiết phong cách streetwear, chất cotton dày 220gsm. Unisex, có thể mặc cho cả nam và nữ.',
  219000, 100,
  '[{"key":"demo/streetwear.jpg","url":"https://picsum.photos/seed/streetwear/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nam';

-- ══ ÁO NỮ ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Thun Nữ Croptop Basic',
  'ao-thun-nu-croptop-basic',
  'Áo thun nữ croptop cắt ngắn, chất cotton mềm mại. Dễ phối với chân váy hoặc quần cao cạp. Có nhiều màu pastel.',
  149000, 200,
  '[{"key":"demo/croptop.jpg","url":"https://picsum.photos/seed/croptop/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Blouse Nữ Tay Bồng Vintage',
  'ao-blouse-nu-tay-bong-vintage',
  'Áo blouse nữ thiết kế tay bồng phong cách vintage, chất voan nhẹ nhàng thoáng mát. Cổ V thanh lịch, phù hợp đi làm hoặc dạo phố.',
  289000, 100,
  '[{"key":"demo/blouse.jpg","url":"https://picsum.photos/seed/blouse/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Khoác Cardigan Len Mỏng Hàn Quốc',
  'ao-khoac-cardigan-len-mong-han-quoc',
  'Áo cardigan len mỏng phong cách Hàn Quốc. Chất len mềm mại, không xù lông. Mặc trong nhà hoặc ra ngoài đều đẹp.',
  329000, 75,
  '[{"key":"demo/cardigan.jpg","url":"https://picsum.photos/seed/cardigan/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Đầm Maxi Hoa Nhí Dáng Xòe Dạo Phố',
  'dam-maxi-hoa-nhi-dang-xoe-dao-pho',
  'Đầm maxi họa tiết hoa nhí duyên dáng, chất lụa mát, dáng xòe thướt tha. Phù hợp đi biển, dạo phố, chụp ảnh.',
  389000, 60,
  '[{"key":"demo/dam-maxi.jpg","url":"https://picsum.photos/seed/dammaxi/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Len Cổ Lọ Nữ Dệt Kim',
  'ao-len-co-lo-nu-det-kim',
  'Áo len cổ lọ dệt kim nữ giữ ấm tốt. Chất len cao cấp mềm, không ngứa, không xù. Màu sắc thanh lịch.',
  359000, 85,
  '[{"key":"demo/ao-len.jpg","url":"https://picsum.photos/seed/aolennu/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Sét Áo Nữ Croptop + Quần Ống Rộng',
  'set-ao-nu-croptop-quan-ong-rong',
  'Bộ set đồ nữ gồm áo croptop + quần ống rộng co giãn. Chất liệu thun gân dày dặn, form dáng tôn vóc dáng.',
  399000, 70,
  '[{"key":"demo/set-nu.jpg","url":"https://picsum.photos/seed/setnu/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'ao-nu';

-- ══ QUẦN NAM ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Quần Jean Nam Slim Fit Xanh Đậm',
  'quan-jean-nam-slim-fit-xanh-dam',
  'Quần jean nam dáng slim fit, màu xanh đậm cổ điển. Chất denim dày co giãn nhẹ, thoải mái. Phù hợp đi làm và đi chơi.',
  459000, 100,
  '[{"key":"demo/jean-nam.jpg","url":"https://picsum.photos/seed/jeans/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Quần Kaki Nam Công Sở Slim',
  'quan-kaki-nam-cong-so-slim',
  'Quần kaki nam dáng slim, chất kaki cao cấp không nhăn. Màu be và xám phong cách công sở lịch lãm.',
  399000, 120,
  '[{"key":"demo/kaki-nam.jpg","url":"https://picsum.photos/seed/kaki/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Quần Short Nam Thể Thao Mặc Nhà',
  'quan-short-nam-the-thao-mac-nha',
  'Quần short nam chất thun lạnh, co giãn 4 chiều. Phù hợp mặc nhà, tập gym, chạy bộ. Có dây rút điều chỉnh eo.',
  179000, 180,
  '[{"key":"demo/short-nam.jpg","url":"https://picsum.photos/seed/short/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nam';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Quần Tây Nam Ống Đứng Cao Cấp',
  'quan-tay-nam-ong-dung-cao-cap',
  'Quần tây nam ống đứng, chất poly-viscose cao cấp không nhăn. Phù hợp văn phòng, hội họp, tiệc tùng.',
  599000, 50,
  '[{"key":"demo/quan-tay.jpg","url":"https://picsum.photos/seed/quantay/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nam';

-- ══ QUẦN NỮ ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Chân Váy Chữ A Kẻ Caro Preppy',
  'chan-vay-chu-a-ke-caro-preppy',
  'Chân váy chữ A họa tiết kẻ caro phong cách preppy. Chất dạ nhẹ, giữ form tốt. Dài qua gối thanh lịch.',
  289000, 90,
  '[{"key":"demo/chan-vay.jpg","url":"https://picsum.photos/seed/skirt/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Quần Jean Nữ Ống Rộng Baggy Y2K',
  'quan-jean-nu-ong-rong-baggy-y2k',
  'Quần jean nữ dáng baggy ống rộng phong cách Y2K đang trend. Lưng cao tôn dáng, phối đẹp với áo thun tuck-in.',
  429000, 80,
  '[{"key":"demo/baggy-nu.jpg","url":"https://picsum.photos/seed/baggy/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nu';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Quần Legging Nữ Co Giãn 4 Chiều',
  'quan-legging-nu-co-gian-4-chieu',
  'Quần legging nữ thun lạnh co giãn 4 chiều, nâng mông, che khuyết điểm. Phù hợp tập yoga, gym, chạy bộ.',
  199000, 150,
  '[{"key":"demo/legging.jpg","url":"https://picsum.photos/seed/legging/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-nu';

-- ══ GIÀY DÉP ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Giày Sneaker Nam Trắng Classic',
  'giay-sneaker-nam-trang-classic',
  'Giày sneaker nam màu trắng thiết kế classic không lỗi mốt. Đế cao su chống trượt, lót mềm êm chân. Chất da PU cao cấp.',
  699000, 60,
  '[{"key":"demo/sneaker.jpg","url":"https://picsum.photos/seed/sneaker/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'giay-dep';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Giày Thể Thao Nữ Running Siêu Nhẹ',
  'giay-the-thao-nu-running-sieu-nhe',
  'Giày thể thao nữ chuyên dụng cho chạy bộ. Đế EVA siêu nhẹ, thiết kế thoáng khí. Phù hợp chạy bộ, đi bộ, gym.',
  599000, 70,
  '[{"key":"demo/running.jpg","url":"https://picsum.photos/seed/running/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'giay-dep';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Dép Sandal Nam Da Bò Quai Hậu',
  'dep-sandal-nam-da-bo-quai-hau',
  'Dép sandal nam quai hậu chất da bò thật, đế cao su đúc. Phong cách lịch lãm phù hợp đi biển và dạo phố.',
  449000, 50,
  '[{"key":"demo/sandal.jpg","url":"https://picsum.photos/seed/sandal/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'giay-dep';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Giày Cao Gót Nữ 7cm Mũi Nhọn',
  'giay-cao-got-nu-7cm-mui-nhon',
  'Giày cao gót nữ mũi nhọn cao 7cm, da PU bóng mịn. Kiểu dáng thanh lịch phù hợp văn phòng, tiệc tùng.',
  529000, 45,
  '[{"key":"demo/caogot.jpg","url":"https://picsum.photos/seed/heels/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'giay-dep';

-- ══ TÚI XÁCH ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Túi Tote Canvas Đi Học Đi Chơi',
  'tui-tote-canvas-di-hoc-di-choi',
  'Túi tote canvas dày dặn, sức chứa lớn. Phù hợp đi học, mua sắm, dã ngoại. Nhiều màu sắc trẻ trung.',
  179000, 200,
  '[{"key":"demo/tote.jpg","url":"https://picsum.photos/seed/tote/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'tui-xach-vi';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Ví Da Nam Ngang Đựng Card',
  'vi-da-nam-ngang-dung-card',
  'Ví da nam thiết kế ngang gọn gàng, nhiều ngăn đựng card, tiền mặt. Chất da bò thật bền đẹp.',
  299000, 100,
  '[{"key":"demo/wallet.jpg","url":"https://picsum.photos/seed/wallet/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'tui-xach-vi';

-- ══ ĐIỆN THOẠI ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Samsung Galaxy A55 5G 256GB',
  'samsung-galaxy-a55-5g-256gb',
  'Samsung Galaxy A55 5G màn hình AMOLED 6.6 inch, camera 50MP OIS, pin 5000mAh sạc nhanh 45W. RAM 8GB, bộ nhớ 256GB.',
  10990000, 30,
  '[{"key":"demo/samsung-a55.jpg","url":"https://picsum.photos/seed/samsung/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dien-thoai';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Xiaomi Redmi Note 13 Pro 128GB',
  'xiaomi-redmi-note-13-pro-128gb',
  'Xiaomi Redmi Note 13 Pro màn hình AMOLED 6.67 inch 120Hz, camera 200MP, pin 5100mAh sạc nhanh 67W.',
  7490000, 40,
  '[{"key":"demo/xiaomi.jpg","url":"https://picsum.photos/seed/xiaomi/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dien-thoai';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'OPPO Reno 11F 5G 256GB',
  'oppo-reno-11f-5g-256gb',
  'OPPO Reno 11F 5G thiết kế mỏng nhẹ, màn hình AMOLED 6.7 inch, camera selfie 32MP, sạc nhanh 67W.',
  8490000, 25,
  '[{"key":"demo/oppo.jpg","url":"https://picsum.photos/seed/oppo/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dien-thoai';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'iPhone 14 128GB Chính Hãng VN/A',
  'iphone-14-128gb-chinh-hang-vna',
  'iPhone 14 chip A15 Bionic, camera 12MP với Action Mode, màn hình Super Retina XDR 6.1 inch. Pin cải tiến 20%.',
  18990000, 20,
  '[{"key":"demo/iphone14.jpg","url":"https://picsum.photos/seed/iphone/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dien-thoai';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Vivo V29e 5G 256GB Xanh Ngọc',
  'vivo-v29e-5g-256gb-xanh-ngoc',
  'Vivo V29e 5G màn hình AMOLED cong 6.67 inch, camera sau 64MP + 8MP + 2MP, camera selfie 50MP, pin 4800mAh.',
  7990000, 35,
  '[{"key":"demo/vivo.jpg","url":"https://picsum.photos/seed/vivo/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dien-thoai';

-- ══ LAPTOP ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Laptop ASUS VivoBook 15 i5-1235U RAM 8GB SSD 512GB',
  'laptop-asus-vivobook-15-i5-1235u',
  'ASUS VivoBook 15 màn hình FHD 15.6 inch, CPU Intel Core i5-1235U, RAM 8GB, SSD 512GB. Phù hợp học tập, văn phòng.',
  14990000, 15,
  '[{"key":"demo/asus.jpg","url":"https://picsum.photos/seed/laptop1/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'laptop';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Laptop Dell Inspiron 15 3525 AMD Ryzen 5',
  'laptop-dell-inspiron-15-3525-ryzen5',
  'Dell Inspiron 15 3525 CPU AMD Ryzen 5 5625U, RAM 8GB DDR4, SSD 512GB PCIe, màn hình FHD 120Hz.',
  13490000, 12,
  '[{"key":"demo/dell.jpg","url":"https://picsum.photos/seed/laptop2/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'laptop';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'MacBook Air M2 8GB 256GB Midnight',
  'macbook-air-m2-8gb-256gb-midnight',
  'MacBook Air chip Apple M2, màn hình Liquid Retina 13.6 inch, RAM 8GB, SSD 256GB. Siêu mỏng nhẹ, pin 18 giờ.',
  27990000, 10,
  '[{"key":"demo/macbook.jpg","url":"https://picsum.photos/seed/macbook/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'laptop';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Laptop HP Pavilion 15 i7-1255U RTX 2050',
  'laptop-hp-pavilion-15-i7-1255u-rtx2050',
  'HP Pavilion 15 CPU i7-1255U, RAM 16GB, SSD 512GB, GPU RTX 2050 4GB. Màn hình FHD IPS 144Hz, phù hợp gaming nhẹ và đồ hoạ.',
  20990000, 8,
  '[{"key":"demo/hp.jpg","url":"https://picsum.photos/seed/laptop3/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'laptop';

-- ══ TAI NGHE ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Tai Nghe Chống Ồn Sony WH-1000XM5',
  'tai-nghe-chong-on-sony-wh1000xm5',
  'Sony WH-1000XM5 chống ồn hàng đầu, âm thanh Hi-Res, pin 30 giờ. Kết nối multipoint 2 thiết bị cùng lúc.',
  7490000, 20,
  '[{"key":"demo/sony-xm5.jpg","url":"https://picsum.photos/seed/headphone/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'tai-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Samsung Galaxy Buds2 Pro True Wireless',
  'samsung-galaxy-buds2-pro-tws',
  'Galaxy Buds2 Pro chống ồn ANC, âm thanh 360 Audio, chống nước IPX7. Pin 5 giờ + hộp sạc 13 giờ.',
  3990000, 35,
  '[{"key":"demo/buds2.jpg","url":"https://picsum.photos/seed/earbuds/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'tai-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Tai Nghe Gaming HyperX Cloud Alpha Wired',
  'tai-nghe-gaming-hyperx-cloud-alpha',
  'HyperX Cloud Alpha driver kép, âm thanh vòm 7.1 ảo, mic tháo rời chống ồn. Tương thích PC, PS4, Xbox.',
  2290000, 25,
  '[{"key":"demo/hyperx.jpg","url":"https://picsum.photos/seed/gaming/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'tai-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Apple AirPods Pro 2nd Gen USB-C',
  'apple-airpods-pro-2nd-gen-usbc',
  'AirPods Pro Gen 2 chống ồn H2 chip, âm thanh Adaptive Audio tự điều chỉnh, chống nước IPX4, hộp sạc USB-C.',
  6490000, 15,
  '[{"key":"demo/airpods.jpg","url":"https://picsum.photos/seed/airpods/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'tai-nghe';

-- ══ PHỤ KIỆN CÔNG NGHỆ ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Sạc Nhanh 65W GaN 3 Cổng Baseus',
  'sac-nhanh-65w-gan-3-cong-baseus',
  'Củ sạc 65W GaN nhỏ gọn, 3 cổng (1 USB-A + 2 USB-C), tương thích PD/QC4+. Sạc laptop, điện thoại cùng lúc.',
  499000, 80,
  '[{"key":"demo/charger.jpg","url":"https://picsum.photos/seed/charger/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'phu-kien-cong-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Pin Dự Phòng 20000mAh Anker 522',
  'pin-du-phong-20000mah-anker-522',
  'Anker 522 20000mAh sạc nhanh 22.5W, 2 USB-A + 1 USB-C. Công nghệ MultiProtect an toàn, nhỏ gọn bỏ túi.',
  649000, 60,
  '[{"key":"demo/powerbank.jpg","url":"https://picsum.photos/seed/powerbank/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'phu-kien-cong-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Cáp USB-C to USB-C 100W 2m Bọc Nylon',
  'cap-usbc-to-usbc-100w-2m',
  'Cáp USB-C hai đầu hỗ trợ sạc nhanh 100W, truyền dữ liệu 480Mbps. Dây bọc nylon bền chắc, dài 2m.',
  149000, 200,
  '[{"key":"demo/cable.jpg","url":"https://picsum.photos/seed/cable/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'phu-kien-cong-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Bàn Phím Cơ Gaming Keychron K2 RGB',
  'ban-phim-co-gaming-keychron-k2-rgb',
  'Bàn phím cơ Keychron K2 75% layout, switch Gateron Red/Brown/Blue, đèn nền RGB, kết nối có dây USB-C và Bluetooth 5.1.',
  2290000, 20,
  '[{"key":"demo/keyboard.jpg","url":"https://picsum.photos/seed/keyboard/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'phu-kien-cong-nghe';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Chuột Không Dây Logitech MX Master 3S',
  'chuot-khong-day-logitech-mx-master-3s',
  'Logitech MX Master 3S 8000 DPI, cuộn bánh xe MagSpeed siêu êm, kết nối Bolt USB hoặc Bluetooth, pin 70 ngày.',
  2490000, 25,
  '[{"key":"demo/mouse.jpg","url":"https://picsum.photos/seed/mouse/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'phu-kien-cong-nghe';

-- ══ ĐỒ DÙNG NHÀ BẾP ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Nồi Cơm Điện Tử Panasonic 1.8L SR-TEG18',
  'noi-com-dien-tu-panasonic-1-8l',
  'Nồi cơm điện tử Panasonic dung tích 1.8L, nấu áp suất, giữ ấm 24 giờ. Lòng nồi chống dính 5 lớp bền bỉ.',
  1290000, 30,
  '[{"key":"demo/noi-com.jpg","url":"https://picsum.photos/seed/ricecooker/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'do-dung-nha-bep';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Bộ Nồi Inox 304 Sunhouse 3 Chiếc',
  'bo-noi-inox-304-sunhouse-3-chiec',
  'Bộ 3 nồi inox 304 kích cỡ 16cm, 20cm, 24cm. Đáy 3 lớp tản nhiệt đều, dùng được bếp từ, bếp ga, bếp điện.',
  749000, 40,
  '[{"key":"demo/noi.jpg","url":"https://picsum.photos/seed/pots/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'do-dung-nha-bep';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Chảo Chống Dính Ceramic Happycall 28cm',
  'chao-chong-dinh-ceramic-happycall-28cm',
  'Chảo ceramic Happycall 28cm chống dính không dùng dầu. Lớp gốm an toàn, không PFOA. Nắp kính cường lực.',
  499000, 50,
  '[{"key":"demo/chao.jpg","url":"https://picsum.photos/seed/pan/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'do-dung-nha-bep';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Máy Xay Sinh Tố Philips HR2041 700W',
  'may-xay-sinh-to-philips-hr2041-700w',
  'Máy xay Philips 700W, 2 tốc độ, lưỡi dao ProBlend 4D xay mịn. Cốc 2L, nắp rót tiện lợi, dễ vệ sinh.',
  899000, 25,
  '[{"key":"demo/blender.jpg","url":"https://picsum.photos/seed/blender/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'do-dung-nha-bep';

-- ══ NỘI THẤT ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Đèn Ngủ LED Cảm Ứng Sạc USB',
  'den-ngu-led-cam-ung-sac-usb',
  'Đèn ngủ LED cảm ứng chạm 3 mức sáng, sạc USB Type-C, pin 8 giờ. Thiết kế tối giản sang trọng.',
  199000, 100,
  '[{"key":"demo/den-ngu.jpg","url":"https://picsum.photos/seed/nightlight/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'noi-that-trang-tri';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Gối Ôm Bông Gòn Mềm Mại Size L 35x100cm',
  'goi-om-bong-gon-mem-mai-size-l',
  'Gối ôm bông gòn cao cấp 35x100cm. Vỏ cotton thoáng mát, ruột bông không vón cục, giữ form tốt.',
  159000, 80,
  '[{"key":"demo/goi.jpg","url":"https://picsum.photos/seed/pillow/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'noi-that-trang-tri';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Kệ Sách Gỗ MDF 5 Tầng Lắp Ráp',
  'ke-sach-go-mdf-5-tang-lap-rap',
  'Kệ sách gỗ MDF 5 tầng dễ lắp ráp, dùng làm kệ trưng bày hoặc kệ sách. Tải trọng mỗi tầng 10kg.',
  699000, 20,
  '[{"key":"demo/ke-sach.jpg","url":"https://picsum.photos/seed/shelf/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'noi-that-trang-tri';

-- ══ DỤNG CỤ THỂ THAO ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Tạ Tay Cao Su 5kg Đôi',
  'ta-tay-cao-su-5kg-doi',
  'Đôi tạ tay 5kg bọc cao su chắc chắn, không trượt tay, không trầy sàn. Phù hợp tập tay, ngực, vai tại nhà.',
  399000, 50,
  '[{"key":"demo/dumbbell.jpg","url":"https://picsum.photos/seed/dumbbell/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dung-cu-the-thao';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Thảm Yoga TPE 6mm Hai Lớp Cao Cấp',
  'tham-yoga-tpe-6mm-hai-lop',
  'Thảm yoga TPE 2 lớp dày 6mm, kích thước 183x61cm. Chống trơn 2 mặt, không mùi, thân thiện môi trường.',
  349000, 60,
  '[{"key":"demo/yogamat.jpg","url":"https://picsum.photos/seed/yoga/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dung-cu-the-thao';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Bóng Đá Futsal Động Lực Số 4',
  'bong-da-futsal-dong-luc-so-4',
  'Bóng futsal Động Lực FIFA Approved số 4. Đường may chắc, trọng lượng chuẩn thi đấu, chống thấm nước.',
  299000, 40,
  '[{"key":"demo/football.jpg","url":"https://picsum.photos/seed/football/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dung-cu-the-thao';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Vợt Cầu Lông Yonex Astrox 7 DG',
  'vot-cau-long-yonex-astrox-7-dg',
  'Vợt cầu lông Yonex Astrox 7 DG đầu nặng phù hợp lối chơi công. Khung carbon chắc chắn, tay cầm tiêu chuẩn G4.',
  1490000, 20,
  '[{"key":"demo/badminton.jpg","url":"https://picsum.photos/seed/badminton/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'dung-cu-the-thao';

-- ══ QUẦN ÁO THỂ THAO ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Bộ Quần Áo Thể Thao Nam Dry-Fit Thoáng Khí',
  'bo-quan-ao-the-thao-nam-dry-fit',
  'Bộ nam gồm áo cộc tay + quần short Dry-Fit thoát mồ hôi nhanh. Phù hợp chạy bộ, gym, cầu lông.',
  299000, 80,
  '[{"key":"demo/sport-set.jpg","url":"https://picsum.photos/seed/sportset/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-ao-the-thao';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Áo Phông Thể Thao Nữ Yoga Crotop',
  'ao-phong-the-thao-nu-yoga-croptop',
  'Áo croptop thể thao nữ chất liệu Dry-Fit thoáng khí, co giãn 4 chiều. Phù hợp yoga, gym, đi bộ buổi sáng.',
  199000, 100,
  '[{"key":"demo/sport-top.jpg","url":"https://picsum.photos/seed/sporttop/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'quan-ao-the-thao';

-- ══ SÁCH ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Đắc Nhân Tâm - Dale Carnegie (Bìa Cứng)',
  'dac-nhan-tam-dale-carnegie-bia-cung',
  'Cuốn sách kỹ năng giao tiếp bán chạy nhất mọi thời đại. Hơn 15 triệu bản bán tại 36 quốc gia. Bìa cứng cao cấp.',
  79000, 300,
  '[{"key":"demo/book-dacnhantam.jpg","url":"https://picsum.photos/seed/book1/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'sach-van-phong-pham';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Nhà Giả Kim - Paulo Coelho',
  'nha-gia-kim-paulo-coelho',
  'Tiểu thuyết triết học nổi tiếng về hành trình khám phá bản thân. Bản dịch tiếng Việt của NXB Hội Nhà Văn.',
  69000, 250,
  '[{"key":"demo/book-nhagiakim.jpg","url":"https://picsum.photos/seed/book2/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'sach-van-phong-pham';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Tư Duy Nhanh Và Chậm - Daniel Kahneman',
  'tu-duy-nhanh-va-cham-daniel-kahneman',
  'Khám phá hai hệ thống tư duy của con người: trực giác và lý trí. Được đề xuất bởi Bill Gates và nhiều CEO.',
  119000, 150,
  '[{"key":"demo/book-tuduy.jpg","url":"https://picsum.photos/seed/book3/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'sach-van-phong-pham';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Atomic Habits - James Clear (Thói Quen Nguyên Tử)',
  'atomic-habits-james-clear-viet',
  'Cuốn sách về xây dựng thói quen tốt và loại bỏ thói quen xấu bằng những thay đổi nhỏ 1% mỗi ngày.',
  89000, 200,
  '[{"key":"demo/book-atomic.jpg","url":"https://picsum.photos/seed/book4/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'sach-van-phong-pham';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Bộ Sách Lịch Sử Việt Nam Toàn Thư (3 Tập)',
  'bo-sach-lich-su-viet-nam-toan-thu-3-tap',
  'Bộ 3 tập Lịch sử Việt Nam từ thời dựng nước đến hiện đại. Tư liệu phong phú, tranh ảnh minh họa.',
  389000, 80,
  '[{"key":"demo/book-lichsu.jpg","url":"https://picsum.photos/seed/book5/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'sach-van-phong-pham';

-- ══ MỸ PHẨM ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Kem Chống Nắng Anessa SPF50+ PA++++ 60ml',
  'kem-chong-nang-anessa-spf50-pa-60ml',
  'Anessa Perfect UV SPF50+ PA++++ chống UVA/UVB. Kết cấu sữa mỏng nhẹ, không bết dính, thích hợp da dầu và hỗn hợp.',
  399000, 100,
  '[{"key":"demo/anessa.jpg","url":"https://picsum.photos/seed/sunscreen/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'my-pham-cham-soc';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Serum Vitamin C Klairs Freshly Juiced 35ml',
  'serum-vitamin-c-klairs-freshly-juiced-35ml',
  'Serum Vitamin C Klairs nồng độ 5% ổn định, dưỡng sáng da, mờ thâm, chống oxy hóa. Phù hợp da nhạy cảm.',
  499000, 80,
  '[{"key":"demo/serum.jpg","url":"https://picsum.photos/seed/serum/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'my-pham-cham-soc';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Nước Tẩy Trang Bioderma Sensibio H2O 500ml',
  'nuoc-tay-trang-bioderma-sensibio-h2o-500ml',
  'Nước tẩy trang Bioderma dành cho da nhạy cảm, tẩy sạch makeup không cần rửa lại. Dịu nhẹ, không cồn.',
  349000, 90,
  '[{"key":"demo/bioderma.jpg","url":"https://picsum.photos/seed/micellar/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'my-pham-cham-soc';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Son Lì MAC Matte Lipstick Ruby Woo',
  'son-li-mac-matte-ruby-woo',
  'Son MAC màu Ruby Woo đỏ cổ điển huyền thoại. Lên màu chuẩn, bám lâu 6-8 tiếng, không khô môi.',
  599000, 60,
  '[{"key":"demo/lipstick.jpg","url":"https://picsum.photos/seed/lipstick/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'my-pham-cham-soc';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Dầu Gội Đầu Rejoice Hương Hoa 650ml',
  'dau-goi-dau-rejoice-huong-hoa-650ml',
  'Dầu gội Rejoice hương hoa thiên nhiên, làm sạch sâu, giảm gàu, tóc mềm mượt từ gốc đến ngọn.',
  89000, 200,
  '[{"key":"demo/shampoo.jpg","url":"https://picsum.photos/seed/shampoo/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'my-pham-cham-soc';

-- ══ THỰC PHẨM ══
INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Cà Phê Rang Xay Highlands Arabica 500g',
  'ca-phe-rang-xay-highlands-arabica-500g',
  'Cà phê Highlands Arabica 100% rang xay, độ rang vừa, hương thơm đặc trưng. Phù hợp pha phin và máy espresso.',
  179000, 200,
  '[{"key":"demo/coffee.jpg","url":"https://picsum.photos/seed/coffee/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'thuc-pham-do-uong';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Trà Oolong Ali Shan Đài Loan 500g',
  'tra-oolong-ali-shan-dai-loan-500g',
  'Trà Oolong Ali Shan cao cấp, hương thơm nhẹ nhàng tự nhiên. Pha trà sữa hay uống nóng đều tuyệt vời.',
  249000, 100,
  '[{"key":"demo/tea.jpg","url":"https://picsum.photos/seed/tea/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'thuc-pham-do-uong';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Yến Mạch Quaker Nguyên Hạt Rolled Oats 2kg',
  'yen-mach-quaker-nguyen-hat-2kg',
  'Yến mạch Quaker nguyên hạt 2kg, giàu beta-glucan, tốt cho tim mạch, hỗ trợ giảm cân. Không đường, không muối.',
  199000, 150,
  '[{"key":"demo/oats.jpg","url":"https://picsum.photos/seed/oats/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'thuc-pham-do-uong';

INSERT INTO products (category_id, name, slug, description, price, stock_qty, images, is_active)
SELECT c.id,
  'Mật Ong Rừng Nguyên Chất Tây Nguyên 500ml',
  'mat-ong-rung-nguyen-chat-tay-nguyen-500ml',
  'Mật ong rừng Tây Nguyên nguyên chất 100%, không pha trộn, không chất bảo quản. Đậm vị, màu vàng sậm đặc trưng.',
  289000, 80,
  '[{"key":"demo/honey.jpg","url":"https://picsum.photos/seed/honey/400/400","isThumbnail":true}]',
  true
FROM categories c WHERE c.slug = 'thuc-pham-do-uong';

-- Đảm bảo search vector được cập nhật (trigger đã chạy khi INSERT, đây là backup)
UPDATE products SET updated_at = NOW() WHERE search_vector IS NULL;

-- Kết quả tổng kết
SELECT
  (SELECT COUNT(*) FROM categories)                AS tong_categories,
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL) AS root_categories,
  (SELECT COUNT(*) FROM products)                  AS tong_products;
