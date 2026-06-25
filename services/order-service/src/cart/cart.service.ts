import { Injectable } from '@nestjs/common';
import { RedisService, CartItem } from '../common/redis.service';

@Injectable()
export class CartService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Thêm item vào cart hoặc cập nhật quantity nếu đã tồn tại
   */
  async addItem(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
    await this.redisService.addToCart(userId, productId, quantity);
    return this.redisService.getCart(userId);
  }

  /**
   * Lấy toàn bộ cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    return this.redisService.getCart(userId);
  }

  /**
   * Xóa 1 item từ cart
   */
  async removeItem(userId: string, productId: string): Promise<CartItem[]> {
    await this.redisService.removeFromCart(userId, productId);
    return this.redisService.getCart(userId);
  }

  /**
   * Xóa toàn bộ cart
   */
  async clearCart(userId: string): Promise<void> {
    await this.redisService.clearCart(userId);
  }

  /**
   * Cập nhật quantity của item
   */
  async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
    await this.redisService.updateCartItemQuantity(userId, productId, quantity);
    return this.redisService.getCart(userId);
  }
}
