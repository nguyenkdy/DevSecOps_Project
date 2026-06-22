import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  stockQty: number;
  categoryId?: string;
}

/**
 * HTTP Client gọi Product Service
 * Dùng cho: GET product details, POST decrement stock
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('externalServices.productServiceUrl') ?? 'http://localhost:3002';
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
    });
  }

  /**
   * Lấy chi tiết sản phẩm từ Product Service
   */
  async getProduct(productId: string): Promise<ProductDto> {
    try {
      const response = await this.http.get<ProductDto>(`/api/v1/products/${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Lỗi lấy product ${productId}: ${error.message}`);
      throw new BadRequestException(`Sản phẩm ${productId} không tồn tại`);
    }
  }

  /**
   * Giảm stock sản phẩm (dùng khi checkout)
   * Internal endpoint, yêu cầu JWT admin token
   */
  async decrementStock(productId: string, quantity: number, token: string): Promise<void> {
    try {
      await this.http.post(
        `/api/v1/products/${productId}/stock/decrement`,
        { quantity },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch (error) {
      if (error.response?.status === 400) {
        throw new BadRequestException(`Không đủ stock cho sản phẩm ${productId}`);
      }
      this.logger.error(`Lỗi giảm stock ${productId}: ${error.message}`);
      throw new BadRequestException('Lỗi cập nhật stock sản phẩm');
    }
  }
}
