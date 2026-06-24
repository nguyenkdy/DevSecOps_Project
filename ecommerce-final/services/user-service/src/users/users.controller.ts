import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    const entity = await this.usersService.findById(user.userId);
    return this.usersService.toResponse(entity);
  }

  @Put('me')
  updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser('userId') userId: string) {
    return this.usersService.listAddresses(userId);
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  addAddress(@CurrentUser('userId') userId: string, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(userId, dto);
  }

  @Get('me/wallet')
  async getWallet(@CurrentUser('userId') userId: string) {
    const balance = await this.usersService.getWalletBalance(userId);
    return { balance };
  }

  /** Nạp tiền demo — mỗi lần nạp 500,000 VND */
  @Post('me/wallet/topup')
  @HttpCode(HttpStatus.OK)
  async topUpWallet(@CurrentUser('userId') userId: string) {
    const balance = await this.usersService.topUpWallet(userId, 500_000);
    return { balance };
  }
}
