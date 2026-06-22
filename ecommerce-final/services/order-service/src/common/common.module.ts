import { Global, Module } from '@nestjs/common';
import { RedisService, redisProvider } from './redis.service';
import { EventPublisherService } from './event-publisher.service';
import { ProductService } from './product.service';

@Global()
@Module({
  providers: [
    redisProvider,
    RedisService,
    EventPublisherService,
    ProductService,
  ],
  exports: [
    RedisService,
    EventPublisherService,
    ProductService,
  ],
})
export class CommonModule {}
