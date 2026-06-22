import { IsUUID, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Item trong checkout request
 */
export class CheckoutItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * Địa chỉ giao hàng trong checkout
 */
export class ShippingAddressDto {
  street: string;
  ward: string;
  district: string;
  city: string;
  zipCode: string;
}

/**
 * Checkout request DTO
 */
export class CreateCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  paymentMethod?: string; // vnpay, momo, cod
}
