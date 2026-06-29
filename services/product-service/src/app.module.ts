import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { SnakeCaseNamingStrategy } from './database/snake-naming.strategy';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { HealthController } from './health.controller';
import { Product } from './products/entities/product.entity';
import { Category } from './categories/entities/category.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.user'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [Product, Category],
        namingStrategy: new SnakeCaseNamingStrategy(),
        synchronize: false,
        logging: config.get('nodeEnv') === 'development',
        ssl: config.get('nodeEnv') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    ProductsModule,
    CategoriesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
