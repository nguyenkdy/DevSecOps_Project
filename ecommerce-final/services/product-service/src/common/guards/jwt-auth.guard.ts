import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Product Service xác thực JWT bằng cách verify signature trực tiếp.
 * Không gọi User Service — shared secret là đủ để verify token.
 * Đây là pattern Distributed JWT Authentication trong microservices.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret: string;

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('jwt.accessSecret') ?? '';
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Thiếu access token');

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: this.secret });
      req['user'] = { userId: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ hoặc đã hết hạn');
    }
    return true;
  }

  private extractToken(req: Request): string | null {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
