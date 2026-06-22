import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

export interface ProductImage {
  key: string;      // S3 object key
  url: string;      // CloudFront URL
  isThumbnail: boolean;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Slug dùng cho SEO-friendly URL. Ví dụ: "ao-thun-nam-cotton-100"
   * Được tạo tự động từ name nếu không truyền.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 300 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Giá bằng VND, không có decimal.
   * Dùng integer thay vì FLOAT để tránh floating-point errors.
   * Ví dụ: 250000 = 250.000đ
   */
  @Column({ type: 'bigint' })
  price: number;

  @Column({ type: 'integer', default: 0 })
  stockQty: number;

  /**
   * Mảng ảnh lưu dưới JSONB.
   * Tránh tạo bảng product_images riêng cho đơn giản ở quy mô nhỏ.
   */
  @Column({ type: 'jsonb', default: '[]' })
  images: ProductImage[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * tsvector được PostgreSQL tính tự động khi INSERT/UPDATE qua DB trigger.
   * Dùng cho full-text search với GIN index.
   * Không cần populate từ application layer.
   */
  @Column({
    type: 'tsvector',
    nullable: true,
    select: false, // Không trả về field này trong query thông thường
  })
  searchVector: unknown;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
