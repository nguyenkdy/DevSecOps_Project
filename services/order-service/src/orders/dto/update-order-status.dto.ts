import { IsEnum } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

/**
 * Update order status DTO (admin only)
 */
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
