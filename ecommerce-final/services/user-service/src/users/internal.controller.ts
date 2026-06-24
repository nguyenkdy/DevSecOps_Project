import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Internal endpoints — chỉ gọi được từ Docker internal network (payment-service).
 * Không có JWT guard vì không đi qua API gateway.
 */
@Controller('internal/users')
export class InternalController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':id/wallet/deduct')
  @HttpCode(HttpStatus.OK)
  async deductWallet(
    @Param('id') userId: string,
    @Body('amount') amount: number,
  ) {
    const balance = await this.usersService.deductWallet(userId, amount);
    return { balance };
  }
}
