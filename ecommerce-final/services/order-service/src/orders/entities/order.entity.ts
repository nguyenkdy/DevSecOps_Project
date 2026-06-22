import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * Order entity — đơn hàng chính
 * user_id không phải FK vì cross-service (Order Service không join User Service)
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User ID — không FK vì khác service
   */
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Trạng thái đơn hàng
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  /**
   * Tổng tiền (VND, BIGINT để tránh float errors)
   */
  @Column({ type: 'bigint' })
  totalAmount: number;

  /**
   * Địa chỉ giao hàng — snapshot lúc đặt hàng (JSONB)
   */
  @Column({ type: 'jsonb' })
  shippingAddress: {
    street: string;
    ward: string;
    district: string;
    city: string;
    zipCode: string;
  };

  /**
   * Phương thức thanh toán
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  paymentMethod?: string; // vnpay, momo, cod

  /**
   * Trạng thái thanh toán
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  /**
   * Reference ID từ payment service (e.g., VNPay transaction ID)
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  paymentRef?: string;

  /**
   * Ghi chú đơn hàng
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  note?: string;

  /**
   * Quan hệ 1-N với OrderItem
   */
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
