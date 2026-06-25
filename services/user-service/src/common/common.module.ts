import { Global, Module } from '@nestjs/common';
import { RedisService, redisProvider } from './redis.service';
import { EventPublisherService } from './event-publisher.service';

@Global()
@Module({
  providers: [redisProvider, RedisService, EventPublisherService],
  exports: [RedisService, EventPublisherService],
})
export class CommonModule {}
