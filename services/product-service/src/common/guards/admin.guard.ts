import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest();
    if (user?.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới được thực hiện hành động này');
    }
    return true;
  }
}
