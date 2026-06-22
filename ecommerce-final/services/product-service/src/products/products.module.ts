import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), JwtModule.register({})],
  providers: [ProductsService, UploadService, JwtAuthGuard, AdminGuard],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
