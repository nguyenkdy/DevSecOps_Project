import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

/**
 * Routes công khai — không cần JWT.
 * Dùng regex để match path + method.
 */
const PUBLIC_ROUTES: Array<{ pattern: RegExp; methods?: string[] }> = [
  // Auth: đăng ký, đăng nhập, refresh không cần token
  { pattern: /^\/api\/v1\/auth\/(register|login|refresh)$/, methods: ['POST'] },
  // Products / categories: browse công khai (GET)
  { pattern: /^\/api\/v1\/products/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/categories/, methods: ['GET'] },
  // Gateway health check
  { pattern: /^\/api\/v1\/health$/, methods: ['GET'] },
  // Payment callbacks từ VNPay (không mang token người dùng)
  { pattern: /^\/api\/v1\/payments\/callback$/, methods: ['POST'] },
  // Auto-approve chỉ dùng khi demo, không yêu cầu auth
  { pattern: /^\/api\/v1\/payments\/auto-approve\//, methods: ['POST'] },
];

function isPublicRoute(path: string, method: string): boolean {
  for (const route of PUBLIC_ROUTES) {
    const methodMatch = !route.methods || route.methods.includes(method.toUpperCase());
    if (methodMatch && route.pattern.test(path)) {
      return true;
    }
  }
  return false;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

/**
 * Factory tạo Express middleware xác thực JWT.
 * Nếu token hợp lệ, thêm header x-user-* để downstream service nhận diện user.
 * Dùng ở Express level (trước NestJS route) để chạy trước proxy middleware.
 */
export function createJwtMiddleware(jwtService: JwtService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (isPublicRoute(req.path, req.method)) {
      return next();
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Thiếu access token',
      });
    }

    try {
      const payload = await jwtService.verifyAsync(token);

      // Chuyển user info sang downstream service qua internal headers
      req.headers['x-user-id'] = payload.userId ?? payload.sub ?? '';
      req.headers['x-user-email'] = payload.email ?? '';
      req.headers['x-user-role'] = payload.role ?? 'user';

      next();
    } catch {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Token không hợp lệ hoặc đã hết hạn',
      });
    }
  };
}
