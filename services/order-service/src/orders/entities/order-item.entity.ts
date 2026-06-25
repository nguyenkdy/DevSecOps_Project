import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

/**
 * OrderItem entity — chi tiết mặt hàng trong đơn hàng
 * Snapshot giá + tên tại thời điểm mua, không JOIN lại Product
 */
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Quan hệ N-1 với Order
   */
  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  /**
   * Product ID — không FK vì cross-service
   */
  @Column({ type: 'uuid' })
  productId: string;

  /**
   * Snapshot tên sản phẩm lúc mua
   */
  @Column({ type: 'varchar', length: 255 })
  productName: string;

  /**
   * Snapshot slug sản phẩm (dùng để link detail)
   */
  @Column({ type: 'varchar', length: 300, nullable: true })
  productSlug?: string;

  /**
   * Snapshot giá đơn vị lúc mua (BIGINT VND)
   */
  @Column({ type: 'bigint' })
  unitPrice: number;

  /**
   * Số lượng (phải > 0)
   */
  @Column({ type: 'integer' })
  quantity: number;

  /**
   * Tính toán giá subtotal (unitPrice * quantity) — có thể lưu luôn để tránh tính lại
   */
  get subtotal(): number {
    return this.unitPrice * this.quantity;
  }

  @CreateDateColumn()
  createdAt: Date;
}
