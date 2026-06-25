import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (!user) {
      return null;
    }

    // Nếu có đặc tả field (e.g., @CurrentUser('userId')), trả field đó
    if (data) {
      return user[data];
    }

    // Nếu không, trả toàn bộ user
    return user;
  },
);
