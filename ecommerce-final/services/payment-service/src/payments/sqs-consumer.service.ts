import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { PaymentService } from './payments.service';
import { PaymentMethod } from './entities/transaction.entity';

interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  totalAmount: number;
  createdAt: string;
}

/**
 * SQS Consumer — liên tục poll queue `order-created`.
 * Khi nhận message mới → tạo Transaction (pending) cho order đó.
 * Dùng long polling (WaitTimeSeconds=5) để giảm số request empty.
 */
@Injectable()
export class SqsConsumerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private isRunning = false;
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {
    const isLocal = this.configService.get<string>('nodeEnv') !== 'production';

    this.sqsClient = new SQSClient({
      region: this.configService.get<string>('aws.region'),
      ...(isLocal && {
        endpoint: this.configService.get<string>('aws.endpoint'),
        credentials: {
          accessKeyId: this.configService.get<string>('aws.accessKeyId') ?? 'test',
          secretAccessKey: this.configService.get<string>('aws.secretAccessKey') ?? 'test',
        },
      }),
    });

    this.queueUrl = this.configService.get<string>('sqs.queueUrl') ?? '';
  }

  onApplicationBootstrap() {
    if (!this.queueUrl) {
      this.logger.warn('[SQS] SQS_QUEUE_URL chưa cấu hình — bỏ qua consumer');
      return;
    }

    this.isRunning = true;
    this.scheduleNextPoll(0);
    this.logger.log(`[SQS] Bắt đầu poll queue: ${this.queueUrl}`);
  }

  onApplicationShutdown() {
    this.isRunning = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.logger.log('[SQS] Consumer đã dừng');
  }

  private scheduleNextPoll(delayMs: number) {
    this.pollingTimer = setTimeout(() => this.poll(), delayMs);
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      const response = await this.sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 5, // Long polling — giảm số request rỗng
          MessageAttributeNames: ['All'],
        }),
      );

      const messages = response.Messages ?? [];
      if (messages.length > 0) {
        this.logger.log(`[SQS] Nhận ${messages.length} message(s)`);
      }

      for (const msg of messages) {
        await this.handleMessage(msg.Body ?? '', msg.ReceiptHandle ?? '');
      }
    } catch (err) {
      this.logger.error(`[SQS] Lỗi poll: ${(err as Error).message}`);
    }

    // Poll tiếp ngay sau khi xong (SQS long polling tự chờ nếu queue rỗng)
    if (this.isRunning) {
      this.scheduleNextPoll(500);
    }
  }

  private async handleMessage(body: string, receiptHandle: string) {
    let event: OrderCreatedEvent;

    try {
      event = JSON.parse(body) as OrderCreatedEvent;
    } catch {
      this.logger.error(`[SQS] Message JSON không hợp lệ: ${body}`);
      // Xóa message lỗi để tránh loop vô tận
      await this.deleteMessage(receiptHandle);
      return;
    }

    if (!event.orderId || !event.userId || !event.totalAmount) {
      this.logger.error(`[SQS] Message thiếu field bắt buộc: ${body}`);
      await this.deleteMessage(receiptHandle);
      return;
    }

    try {
      // Kiểm tra trùng (idempotent) — nếu đã có transaction thì bỏ qua
      const existing = await this.paymentService.getTransactionByOrder(event.orderId);
      if (existing) {
        this.logger.warn(`[SQS] Transaction đã tồn tại cho order ${event.orderId} — bỏ qua`);
        await this.deleteMessage(receiptHandle);
        return;
      }

      // Tạo transaction mới với status pending
      await this.paymentService.initPaymentFromEvent(
        event.orderId,
        event.userId,
        event.totalAmount,
        PaymentMethod.VNPAY,
      );

      this.logger.log(`[SQS] Tạo transaction thành công cho order ${event.orderId}`);
      await this.deleteMessage(receiptHandle);
    } catch (err) {
      // Không delete → message trở lại queue sau visibility timeout
      this.logger.error(
        `[SQS] Lỗi xử lý message order ${event.orderId}: ${(err as Error).message}`,
      );
    }
  }

  private async deleteMessage(receiptHandle: string) {
    try {
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (err) {
      this.logger.error(`[SQS] Lỗi xóa message: ${(err as Error).message}`);
    }
  }
}
