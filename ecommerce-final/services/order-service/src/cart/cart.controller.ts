import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CartItem } from '../common/redis.service';

export class AddToCartDto {
  productId: string;
  quantity: number;
}

export class UpdateQuantityDto {
  quantity: number;
}

/**
 * Cart Controller — quản lý giỏ hàng (Redis-backed)
 */
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * POST /cart — thêm item vào cart
   */
  @Post()
  async addToCart(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddToCartDto,
  ): Promise<{ data: CartItem[] }> {
    const items = await this.cartService.addItem(user.userId, dto.productId, dto.quantity);
    return { data: items };
  }

  /**
   * GET /cart — xem giỏ hàng
   */
  @Get()
  async getCart(@CurrentUser() user: AuthUser): Promise<{ data: CartItem[] }> {
    const items = await this.cartService.getCart(user.userId);
    return { data: items };
  }

  /**
   * PATCH /cart/:productId — cập nhật quantity
   */
  @Post(':productId')
  async updateQuantity(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateQuantityDto,
  ): Promise<{ data: CartItem[] }> {
    const items = await this.cartService.updateItemQuantity(user.userId, productId, dto.quantity);
    return { data: items };
  }

  /**
   * DELETE /cart/:productId — xóa item khỏi cart
   */
  @Delete(':productId')
  @HttpCode(204)
  async removeFromCart(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ): Promise<void> {
    await this.cartService.removeItem(user.userId, productId);
  }

  /**
   * DELETE /cart — xóa toàn bộ cart
   */
  @Delete()
  @HttpCode(204)
  async clearCart(@CurrentUser() user: AuthUser): Promise<void> {
    await this.cartService.clearCart(user.userId);
  }
}
