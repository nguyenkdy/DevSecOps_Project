import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app.module';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { createJwtMiddleware } from './common/jwt.middleware';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Ẩn stack trace trong log production
    logger: ['log', 'warn', 'error'],
  });

  const config = app.get(ConfigService);
  const jwtService = app.get(JwtService);
  const logger = new Logger('Bootstrap');

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.get('nodeEnv') === 'production'
      ? [/\.yourdomain\.com$/]
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Rate limiting (toàn bộ traffic) ───────────────────────────────────────
  const rl = config.get<any>('rateLimit');

  app.use(
    rateLimit({
      windowMs: rl.windowMs,
      limit: rl.maxRequests,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Quá nhiều request, vui lòng thử lại sau' },
    }),
  );

  // Rate limit chặt hơn cho auth login/register (chống brute-force)
  const authLimiter = rateLimit({
    windowMs: rl.windowMs,
    limit: rl.authMaxRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Quá nhiều lần thử, vui lòng đợi 15 phút' },
  });
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);

  // ─── JWT validation (chạy trước proxy) ─────────────────────────────────────
  app.use(createJwtMiddleware(jwtService));

  // ─── Proxy middlewares ──────────────────────────────────────────────────────
  const services = config.get<any>('services');

  function makeProxy(target: string, label: string): Options {
    return {
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req: any) => {
          // Xóa hop-by-hop headers không cần forward
          proxyReq.removeHeader('x-forwarded-proto');
          // Thêm header nhận diện nguồn
          proxyReq.setHeader('x-gateway', 'api-gateway');
        },
        error: (err: Error, _req: Request, res: any) => {
          logger.error(`[${label}] Proxy error: ${err.message}`);
          if (!res.headersSent) {
            res.status(503).json({
              statusCode: 503,
              message: `Service ${label} tạm thời không khả dụng`,
            });
          }
        },
      },
    };
  }

  // User Service — auth + users
  app.use('/api/v1/auth', createProxyMiddleware(makeProxy(services.userService, 'user-service')));
  app.use('/api/v1/users', createProxyMiddleware(makeProxy(services.userService, 'user-service')));

  // Product Service — catalog + categories
  app.use('/api/v1/products', createProxyMiddleware(makeProxy(services.productService, 'product-service')));
  app.use('/api/v1/categories', createProxyMiddleware(makeProxy(services.productService, 'product-service')));

  // Order Service — cart + orders
  app.use('/api/v1/cart', createProxyMiddleware(makeProxy(services.orderService, 'order-service')));
  app.use('/api/v1/orders', createProxyMiddleware(makeProxy(services.orderService, 'order-service')));

  // Payment Service
  app.use('/api/v1/payments', createProxyMiddleware(makeProxy(services.paymentService, 'payment-service')));

  // ─── NestJS routes (health) ─────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(`API Gateway đang chạy tại http://localhost:${port}/api/v1`);
  logger.log(`Upstream services:`);
  logger.log(`  user-service    → ${services.userService}`);
  logger.log(`  product-service → ${services.productService}`);
  logger.log(`  order-service   → ${services.orderService}`);
  logger.log(`  payment-service → ${services.paymentService}`);
}
bootstrap();
