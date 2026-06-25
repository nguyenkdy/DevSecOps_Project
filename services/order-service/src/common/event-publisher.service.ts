import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod?: string;
}

/**
 * Publish events đến SQS queue.
 * Local: trỏ vào LocalStack endpoint (http://localhost:4566).
 * Production: bỏ endpoint, SDK tự dùng AWS thật qua IAM role.
 *
 * Downstream: Payment Service consume message từ queue này.
 */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private readonly sqs: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly config: ConfigService) {
    const isLocal = this.config.get<string>('nodeEnv') !== 'production';
    this.queueUrl = this.config.get<string>('aws.sqsQueueUrl') ?? '';

    this.sqs = new SQSClient({
      region: this.config.get<string>('aws.region'),
      // Chỉ override endpoint khi local (LocalStack)
      ...(isLocal && {
        endpoint: this.config.get<string>('aws.endpoint'),
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }),
    });
  }

  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    if (!this.queueUrl) {
      this.logger.warn('SQS_QUEUE_URL chưa cấu hình, bỏ qua publish event');
      return;
    }

    try {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(event),
          MessageAttributes: {
            eventType: {
              DataType: 'String',
              StringValue: 'order.created',
            },
          },
        }),
      );
      this.logger.log(`Published order.created cho order ${event.orderId}`);
    } catch (err) {
      // Không throw — event publish thất bại không nên làm fail luồng checkout chính
      this.logger.error(`Lỗi publish SQS event: ${err.message}`);
    }
  }
}
