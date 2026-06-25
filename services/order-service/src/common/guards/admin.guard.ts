import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Admin Guard — kiểm tra role === 'admin'.
 * Luôn dùng sau JwtAuthGuard để req.user đã được set.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có quyền');
    }

    return true;
  }
}
