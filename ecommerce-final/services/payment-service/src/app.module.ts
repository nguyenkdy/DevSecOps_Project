import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthController } from './health.controller';
import { Transaction } from './payments/entities/transaction.entity';
import { PaymentLog } from './payments/entities/payment-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.user'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [Transaction, PaymentLog],
        synchronize: false,
        logging: config.get('nodeEnv') === 'development',
      }),
    }),
    CommonModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
