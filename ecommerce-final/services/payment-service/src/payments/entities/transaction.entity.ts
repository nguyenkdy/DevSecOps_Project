import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  VNPAY = 'vnpay',
  MOMO = 'momo',
  COD = 'cod',
}

@Entity('transactions')
export class Transaction {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  orderId: string;

  @Column('uuid')
  userId: string;

  @Column('bigint')
  amount: number; // VND

  @Column({
    type: 'varchar',
    length: '20',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'varchar',
    length: '20',
    default: PaymentMethod.VNPAY,
  })
  paymentMethod: PaymentMethod;

  @Column('varchar', { nullable: true, length: '255' })
  paymentRef: string | null;

  @Column('text', { nullable: true })
  qrCode: string | null; // Fake QR code (base64)

  @Column('varchar', { nullable: true, length: '500' })
  paymentUrl: string | null; // Fake VNPay URL

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
