import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

/**
 * Orders Controller — quản lý đơn hàng (DB-backed)
 */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders/checkout — tạo đơn hàng từ cart
   * Luồng: verify products → decrement stock → create order → publish SQS → clear cart
   */
  @Post('checkout')
  async checkout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
    @Request() req: any,
  ) {
    const token = this.extractToken(req);
    const order = await this.ordersService.checkout(user.userId, dto, token);
    return { data: order };
  }

  /**
   * GET /orders — list đơn hàng của user (có filter + pagination)
   */
  @Get()
  async getOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryOrderDto,
  ) {
    const result = await this.ordersService.findAllByUser(user.userId, query);
    return result;
  }

  /**
   * GET /orders/:id — chi tiết 1 đơn hàng
   */
  @Get(':id')
  async getOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
  ) {
    const order = await this.ordersService.findOneById(orderId, user.userId);
    return { data: order };
  }

  /**
   * PATCH /orders/:id/status — cập nhật trạng thái (admin only)
   * Dùng cho testing; production sẽ update từ SNS callback
   */
  @Patch(':id/status')
  @UseGuards(AdminGuard)
  async updateStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(orderId, dto.status);
    return { data: order };
  }

  /**
   * Lấy JWT token từ Authorization header
   */
  private extractToken(req: any): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : '';
  }
}
