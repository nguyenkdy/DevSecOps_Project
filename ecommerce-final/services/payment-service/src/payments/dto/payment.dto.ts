import { IsUUID, IsNumber, IsEnum, IsString, IsOptional } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../entities/transaction.entity';

export class InitPaymentDto {
  @IsUUID()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class PaymentCallbackDto {
  @IsString()
  paymentRef: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  message?: string;
}
