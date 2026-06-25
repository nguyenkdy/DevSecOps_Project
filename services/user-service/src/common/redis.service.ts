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

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  /**
   * Lưu refresh token hợp lệ cho 1 user. Dùng để revoke khi logout.
   * Key pattern: refresh:{userId} -> tokenHash
   */
  async storeRefreshToken(userId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`refresh:${userId}:${tokenId}`, '1', 'EX', ttlSeconds);
  }

  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    const exists = await this.client.exists(`refresh:${userId}:${tokenId}`);
    return exists === 1;
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.client.del(`refresh:${userId}:${tokenId}`);
  }

  /** Xoá tất cả refresh token của user — dùng khi logout all devices */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const keys = await this.client.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async setOtp(email: string, otp: string, ttlSeconds = 300): Promise<void> {
    await this.client.set(`otp:${email}`, otp, 'EX', ttlSeconds);
  }

  async getOtp(email: string): Promise<string | null> {
    return this.client.get(`otp:${email}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
