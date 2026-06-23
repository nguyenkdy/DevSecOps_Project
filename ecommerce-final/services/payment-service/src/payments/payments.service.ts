import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import * as QRCode from 'qrcode';
import { Transaction, PaymentStatus, PaymentMethod } from './entities/transaction.entity';
import { PaymentLog, PaymentEvent } from './entities/payment-log.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly snsClient: SNSClient;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(PaymentLog)
    private readonly logRepo: Repository<PaymentLog>,
    private readonly configService: ConfigService,
  ) {
    const isLocal = this.configService.get<string>('nodeEnv') !== 'production';

    this.snsClient = new SNSClient({
      region: this.configService.get<string>('aws.region'),
      ...(isLocal && {
        endpoint: this.configService.get<string>('aws.endpoint'),
        credentials: {
          accessKeyId: this.configService.get<string>('aws.accessKeyId') ?? 'test',
          secretAccessKey: this.configService.get<string>('aws.secretAccessKey') ?? 'test',
        },
      }),
    });
  }

  /**
   * Khởi tạo thanh toán từ API (client gọi trực tiếp)
   * Trả về QR code giả + payment URL giả để demo
   */
  async initPayment(
    orderId: string,
    userId: string,
    amount: number,
    method: PaymentMethod,
  ) {
    const { transaction, paymentRef, qrCode, paymentUrl } =
      await this.createTransaction(orderId, userId, amount, method);

    await this.addLog({
      transactionId: transaction.id,
      orderId,
      userId,
      event: PaymentEvent.PAYMENT_INITIATED,
      payload: { paymentRef, method, amount },
    });

    this.logger.log(`[DEMO] Khởi tạo thanh toán order ${orderId}: ${paymentRef}`);

    return {
      transactionId: transaction.id,
      paymentRef,
      qrCode,       // Base64 PNG — hiển thị trực tiếp trên UI
      paymentUrl,   // Fake URL — redirect demo
      amount,
      status: transaction.status,
    };
  }

  /**
   * Khởi tạo thanh toán từ SQS event (Order Service gửi)
   * Tự động tạo transaction pending khi nhận order-created
   */
  async initPaymentFromEvent(
    orderId: string,
    userId: string,
    amount: number,
    method: PaymentMethod,
  ) {
    const { transaction, paymentRef } = await this.createTransaction(
      orderId,
      userId,
      amount,
      method,
    );

    await this.addLog({
      transactionId: transaction.id,
      orderId,
      userId,
      event: PaymentEvent.ORDER_CREATED_RECEIVED,
      payload: { paymentRef, amount, source: 'sqs' },
    });

    this.logger.log(`[SQS] Tạo transaction từ event order ${orderId}: ${paymentRef}`);
    return transaction;
  }

  /**
   * Xử lý callback thanh toán (client hoặc webhook giả gọi)
   * resultCode '0' hoặc 'success' = thành công, còn lại = thất bại
   */
  async processCallback(paymentRef: string, resultCode: string) {
    const transaction = await this.transactionRepo.findOne({ where: { paymentRef } });

    if (!transaction) {
      throw new NotFoundException(`Không tìm thấy transaction: ${paymentRef}`);
    }

    const isSuccess = resultCode === '0' || resultCode === 'success';
    transaction.status = isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    transaction.metadata = {
      ...(transaction.metadata ?? {}),
      resultCode,
      processedAt: new Date().toISOString(),
      demo: true,
    };

    await this.transactionRepo.save(transaction);

    const event = isSuccess ? PaymentEvent.PAYMENT_SUCCESS : PaymentEvent.PAYMENT_FAILED;
    await this.addLog({
      transactionId: transaction.id,
      orderId: transaction.orderId,
      userId: transaction.userId,
      event,
      payload: { resultCode, paymentRef },
    });

    if (isSuccess) {
      await this.publishOrderPaid(
        transaction.orderId,
        transaction.userId,
        transaction.amount,
        paymentRef,
      );
      this.logger.log(`[DEMO] Thanh toán thành công: ${paymentRef} — order ${transaction.orderId}`);
    } else {
      this.logger.warn(`[DEMO] Thanh toán thất bại: ${paymentRef} — resultCode ${resultCode}`);
    }

    return transaction;
  }

  /**
   * Auto-approve — dùng cho demo/test, bỏ qua bước scan QR
   */
  async autoApprovePayment(paymentRef: string) {
    return this.processCallback(paymentRef, '0');
  }

  /**
   * Lấy chi tiết transaction theo ID
   */
  async getTransaction(transactionId: string) {
    return this.transactionRepo.findOne({ where: { id: transactionId } });
  }

  /**
   * Lấy transaction mới nhất của một order
   */
  async getTransactionByOrder(orderId: string) {
    return this.transactionRepo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lấy audit log của một transaction
   */
  async getLogs(transactionId: string) {
    return this.logRepo.find({
      where: { transactionId },
      order: { createdAt: 'ASC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Tạo Transaction + fake QR code + fake payment URL
   */
  private async createTransaction(
    orderId: string,
    userId: string,
    amount: number,
    method: PaymentMethod,
  ) {
    const paymentRef = `DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const merchantId = this.configService.get<string>('vnpay.merchantId') ?? 'DEMO123';

    // QR data theo định dạng VietQR giả (merchantId|ref|amount|orderId)
    const qrData = `${merchantId}|${paymentRef}|${amount}|${orderId}`;
    const qrCode = await QRCode.toDataURL(qrData, { width: 256 });

    // Fake VNPay sandbox URL
    const paymentUrl =
      `https://sandbox.vnpayment.vn/paygate/vpcpay.html` +
      `?vnp_TxnRef=${paymentRef}&vnp_Amount=${amount * 100}&vnp_OrderInfo=${orderId}`;

    const transaction = this.transactionRepo.create({
      orderId,
      userId,
      amount,
      status: PaymentStatus.PENDING,
      paymentMethod: method,
      paymentRef,
      qrCode,
      paymentUrl,
      metadata: { demo: true, merchantId },
    });

    await this.transactionRepo.save(transaction);
    return { transaction, paymentRef, qrCode, paymentUrl };
  }

  /**
   * Publish SNS event `order.paid` — fan-out đến Order Service + SES Lambda
   */
  private async publishOrderPaid(
    orderId: string,
    userId: string,
    amount: number,
    paymentRef: string,
  ) {
    const topicArn = this.configService.get<string>('sns.topicArn');

    if (!topicArn) {
      this.logger.warn('[SNS] SNS_TOPIC_ARN chưa cấu hình — bỏ qua publish');
      return;
    }

    try {
      await this.snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Subject: 'order.paid',
          Message: JSON.stringify({
            orderId,
            userId,
            amount,
            paymentRef,
            paidAt: new Date().toISOString(),
            demo: true,
          }),
          MessageAttributes: {
            eventType: { DataType: 'String', StringValue: 'order.paid' },
          },
        }),
      );

      await this.addLog({
        transactionId: null,
        orderId,
        userId,
        event: PaymentEvent.SNS_PUBLISHED,
        payload: { topicArn, paymentRef },
      });

      this.logger.log(`[SNS] Published order.paid cho order ${orderId}`);
    } catch (err) {
      await this.addLog({
        transactionId: null,
        orderId,
        userId,
        event: PaymentEvent.SNS_PUBLISH_FAILED,
        payload: { error: (err as Error).message },
      });
      this.logger.error(`[SNS] Lỗi publish: ${(err as Error).message}`);
    }
  }

  /**
   * Ghi audit log (fire-and-forget — lỗi không ảnh hưởng flow chính)
   */
  private async addLog(params: {
    transactionId: string | null;
    orderId: string;
    userId: string | null;
    event: PaymentEvent;
    payload?: Record<string, any>;
  }) {
    try {
      const log = this.logRepo.create({
        transactionId: params.transactionId,
        orderId: params.orderId,
        userId: params.userId,
        event: params.event,
        payload: params.payload ?? null,
      });
      await this.logRepo.save(log);
    } catch (err) {
      this.logger.error(`[Log] Lỗi ghi audit log: ${(err as Error).message}`);
    }
  }
}
