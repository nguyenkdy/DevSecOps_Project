import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Prefix toàn bộ route với /api/v1
  app.setGlobalPrefix('api/v1');

  // Global validation: tự động validate DTO, loại field thừa
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // loại field không khai báo trong DTO
      forbidNonWhitelisted: true, // throw nếu có field lạ
      transform: true, // tự convert type theo DTO
    }),
  );

  // CORS cho frontend Next.js gọi tới
  app.enableCors({
    origin: config.get('nodeEnv') === 'production' ? /\.yourdomain\.com$/ : true,
    credentials: true,
  });

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  logger.log(`User Service đang chạy tại http://localhost:${port}/api/v1`);
  logger.log(`Môi trường: ${config.get('nodeEnv') ?? 'development'}`);
}
bootstrap();
