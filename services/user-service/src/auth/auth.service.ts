import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis.service';
import { EventPublisherService } from '../common/event-publisher.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, TokensDto } from './dto/tokens.dto';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  jti?: string; // token id, dùng cho refresh token để revoke
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
    });

    // Phát event để Lambda gửi welcome email — async, không block
    await this.eventPublisher.publishUserRegistered({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Cùng một message cho cả 2 case để tránh lộ email nào tồn tại
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khoá');
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // Refresh token bắt buộc có jti (được gắn khi issue)
    if (!payload.jti) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // Kiểm tra token còn valid trong Redis (chưa bị logout)
    const valid = await this.redis.isRefreshTokenValid(payload.sub, payload.jti);
    if (!valid) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    // Rotation: revoke token cũ, cấp cặp token mới
    await this.redis.revokeRefreshToken(payload.sub, payload.jti);

    return this.issueTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
      if (payload.jti) {
        await this.redis.revokeRefreshToken(payload.sub, payload.jti);
      }
    } catch {
      // Token đã hết hạn hoặc invalid — coi như logout thành công
      this.logger.debug(`Logout với token invalid cho user ${userId}`);
    }
  }

  /** Cấp access token (ngắn hạn) + refresh token (dài hạn, có jti để revoke). */
  private async issueTokens(payload: JwtPayload): Promise<TokensDto> {
    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpires'),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: payload.sub, email: payload.email, role: payload.role, jti },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpires'),
      },
    );

    // Lưu jti vào Redis với TTL = thời gian sống refresh token (7 ngày)
    const refreshTtlSeconds = 7 * 24 * 60 * 60;
    await this.redis.storeRefreshToken(payload.sub, jti, refreshTtlSeconds);

    return { accessToken, refreshToken };
  }
}
