import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

/**
 * Cart Module — quản lý giỏ hàng trên Redis
 * Không có database, dùng Redis session management
 */
@Module({
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
