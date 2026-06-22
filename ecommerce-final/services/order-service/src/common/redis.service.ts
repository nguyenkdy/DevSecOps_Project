import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    return new Redis({
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  },
};

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: number; // timestamp
}

/**
 * Redis Service — quản lý cart session.
 * Cart stored with key: cart:{userId}
 * Value: JSON array of CartItem
 * TTL: 7 ngày
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly cartTtl = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  /**
   * Thêm hoặc cập nhật item trong cart
   */
  async addToCart(userId: string, productId: string, quantity: number): Promise<void> {
    const cartKey = `cart:${userId}`;
    const cartStr = await this.client.get(cartKey);
    const cart: CartItem[] = cartStr ? JSON.parse(cartStr) : [];

    // Cập nhật quantity nếu đã tồn tại, hoặc thêm mới
    const existingIndex = cart.findIndex((item) => item.productId === productId);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({ productId, quantity, addedAt: Date.now() });
    }

    await this.client.set(cartKey, JSON.stringify(cart), 'EX', this.cartTtl);
  }

  /**
   * Lấy toàn bộ cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    const cartKey = `cart:${userId}`;
    const cartStr = await this.client.get(cartKey);
    return cartStr ? JSON.parse(cartStr) : [];
  }

  /**
   * Xóa 1 item từ cart
   */
  async removeFromCart(userId: string, productId: string): Promise<void> {
    const cartKey = `cart:${userId}`;
    const cartStr = await this.client.get(cartKey);
    if (!cartStr) return;

    const cart: CartItem[] = JSON.parse(cartStr);
    const filtered = cart.filter((item) => item.productId !== productId);

    if (filtered.length === 0) {
      await this.client.del(cartKey);
    } else {
      await this.client.set(cartKey, JSON.stringify(filtered), 'EX', this.cartTtl);
    }
  }

  /**
   * Xóa toàn bộ cart (sau checkout)
   */
  async clearCart(userId: string): Promise<void> {
    const cartKey = `cart:${userId}`;
    await this.client.del(cartKey);
  }

  /**
   * Cập nhật quantity của item
   */
  async updateCartItemQuantity(userId: string, productId: string, quantity: number): Promise<void> {
    const cartKey = `cart:${userId}`;
    const cartStr = await this.client.get(cartKey);
    if (!cartStr) return;

    const cart: CartItem[] = JSON.parse(cartStr);
    const item = cart.find((item) => item.productId === productId);
    if (item) {
      item.quantity = quantity;
    }

    await this.client.set(cartKey, JSON.stringify(cart), 'EX', this.cartTtl);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
