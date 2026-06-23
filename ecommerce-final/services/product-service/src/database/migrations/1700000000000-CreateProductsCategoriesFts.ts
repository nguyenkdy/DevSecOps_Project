import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration này tạo:
 * 1. Bảng categories và products
 * 2. Extension unaccent + pg_trgm cho tìm kiếm tiếng Việt không dấu
 * 3. Text search configuration 'vietnamese_unaccent'
 * 4. DB trigger tự cập nhật searchVector khi INSERT/UPDATE product
 * 5. GIN index trên searchVector để query nhanh
 */
export class CreateProductsCategoriesFts1700000000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // Extensions
    await qr.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    await qr.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // CREATE TEXT SEARCH CONFIGURATION không hỗ trợ IF NOT EXISTS trong PostgreSQL
    // Dùng DO block bắt exception duplicate_object để idempotent
    await qr.query(`
      DO $$ BEGIN
        CREATE TEXT SEARCH CONFIGURATION vietnamese_unaccent (COPY = simple);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await qr.query(`
      ALTER TEXT SEARCH CONFIGURATION vietnamese_unaccent
        ALTER MAPPING FOR hword, hword_part, word
        WITH unaccent, simple
    `);

    // Bảng categories
    await qr.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(120) NOT NULL UNIQUE,
        sort_order  INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Bảng products
    await qr.query(`
      CREATE TABLE IF NOT EXISTS products (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
        name           VARCHAR(255) NOT NULL,
        slug           VARCHAR(300) NOT NULL UNIQUE,
        description    TEXT,
        price          BIGINT NOT NULL CHECK (price >= 0),
        stock_qty      INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
        images         JSONB NOT NULL DEFAULT '[]',
        is_active      BOOLEAN NOT NULL DEFAULT true,
        search_vector  TSVECTOR,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Thêm cột search_vector nếu chưa có (trường hợp synchronize tạo bảng trước migration)
    await qr.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector TSVECTOR`);

    // GIN index cho full-text search
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_products_search_vector
        ON products USING GIN(search_vector)
    `);

    // Index thông thường cho filter hay dùng
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_products_price     ON products(price)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_products_active    ON products(is_active)`);

    // Trigger function: tự cập nhật searchVector khi INSERT/UPDATE
    await qr.query(`
      CREATE OR REPLACE FUNCTION update_product_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('vietnamese_unaccent', unaccent(COALESCE(NEW.name, ''))), 'A') ||
          setweight(to_tsvector('vietnamese_unaccent', unaccent(COALESCE(NEW.description, ''))), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await qr.query(`
      CREATE TRIGGER trigger_product_search_vector
      BEFORE INSERT OR UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();
    `);

    // Backfill cho data hiện có (nếu chạy migration trên DB có dữ liệu rồi)
    await qr.query(`UPDATE products SET name = name`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TRIGGER IF EXISTS trigger_product_search_vector ON products`);
    await qr.query(`DROP FUNCTION IF EXISTS update_product_search_vector`);
    await qr.query(`DROP TABLE IF EXISTS products`);
    await qr.query(`DROP TABLE IF EXISTS categories`);
    await qr.query(`DROP TEXT SEARCH CONFIGURATION IF EXISTS vietnamese_unaccent`);
  }
}
