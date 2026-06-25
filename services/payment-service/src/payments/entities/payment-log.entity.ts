import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PaymentEvent {
  ORDER_CREATED_RECEIVED = 'order_created_received',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  SNS_PUBLISHED = 'sns_published',
  SNS_PUBLISH_FAILED = 'sns_publish_failed',
}

/**
 * PaymentLog — audit trail mọi sự kiện thanh toán
 * Không hard delete, chỉ insert mới
 */
@Entity('payment_logs')
export class PaymentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  transactionId: string | null;

  @Column('uuid')
  orderId: string;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 50 })
  event: PaymentEvent;

  @Column('jsonb', { nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
