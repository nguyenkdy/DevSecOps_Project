import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from './payments.service';
import { InitPaymentDto, PaymentCallbackDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Khởi tạo thanh toán — trả về QR code giả + fake payment URL
   * Client hiển thị QR để simulate scan
   */
  @Post('init')
  @UseGuards(JwtAuthGuard)
  async initPayment(@Body() dto: InitPaymentDto, @CurrentUser() user: AuthUser) {
    this.logger.log(`[DEMO] Khởi tạo thanh toán order ${dto.orderId} — user ${user.userId}`);

    const result = await this.paymentService.initPayment(
      dto.orderId,
      user.userId,
      dto.amount,
      dto.paymentMethod,
    );

    return { data: result };
  }

  /**
   * Callback giả từ VNPay/MoMo (client gọi để simulate kết quả thanh toán)
   * status: "success" | "failed" | "cancelled"
   */
  @Post('callback')
  async handleCallback(@Body() dto: PaymentCallbackDto) {
    this.logger.log(`[DEMO] Callback: ${dto.paymentRef} → ${dto.status}`);

    const resultCode = dto.status === 'success' ? '0' : '1';
    const transaction = await this.paymentService.processCallback(dto.paymentRef, resultCode);

    return { data: transaction };
  }

  /**
   * Auto-approve — bỏ qua bước scan QR, duyệt ngay (dành cho demo / testing)
   * POST /api/v1/payments/auto-approve/:paymentRef
   */
  @Post('auto-approve/:paymentRef')
  async autoApprove(@Param('paymentRef') paymentRef: string) {
    this.logger.log(`[DEMO] Auto-approve: ${paymentRef}`);

    const transaction = await this.paymentService.autoApprovePayment(paymentRef);

    return { data: transaction };
  }

  /**
   * Audit log của một transaction
   * GET /api/v1/payments/:transactionId/logs
   */
  @Get(':transactionId/logs')
  @UseGuards(JwtAuthGuard)
  async getLogs(@Param('transactionId') transactionId: string) {
    const logs = await this.paymentService.getLogs(transactionId);
    return { data: logs };
  }

  /**
   * Chi tiết transaction theo transactionId
   * GET /api/v1/payments/:transactionId
   */
  @Get(':transactionId')
  @UseGuards(JwtAuthGuard)
  async getTransaction(@Param('transactionId') id: string) {
    const transaction = await this.paymentService.getTransaction(id);

    if (!transaction) {
      throw new NotFoundException('Transaction không tồn tại');
    }

    return { data: transaction };
  }

  /**
   * Transaction mới nhất của một order
   * GET /api/v1/payments/order/:orderId
   */
  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async getByOrder(@Param('orderId') orderId: string) {
    const transaction = await this.paymentService.getTransactionByOrder(orderId);

    if (!transaction) {
      throw new NotFoundException('Chưa có thông tin thanh toán cho đơn hàng này');
    }

    return { data: transaction };
  }
}
