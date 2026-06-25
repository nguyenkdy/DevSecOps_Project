import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters cho list orders
 */
export class QueryOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  status?: string; // pending, confirmed, shipping, delivered, cancelled

  @IsOptional()
  paymentStatus?: string; // pending, paid, failed, refunded
}
