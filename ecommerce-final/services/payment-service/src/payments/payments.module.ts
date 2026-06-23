import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { PaymentService } from './payments.service';
import { PaymentController } from './payments.controller';
import { SqsConsumerService } from './sqs-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, PaymentLog])],
  providers: [PaymentService, SqsConsumerService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentsModule {}
