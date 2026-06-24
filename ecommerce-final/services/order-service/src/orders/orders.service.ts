import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { RedisService } from '../common/redis.service';
import { ProductService } from '../common/product.service';
import { EventPublisherService } from '../common/event-publisher.service';

export interface OrderWithItems {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  shippingAddress: any;
  paymentMethod?: string;
  items: Array<{
    productId: string;
    productName: string;
    productSlug?: string;
    unitPrice: number;
    quantity: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly redisService: RedisService,
    private readonly productService: ProductService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Luồng Checkout chính
   * 1. Fetch products từ Product Service
   * 2. Verify stock đủ
   * 3. Decrement stock trên Product Service
   * 4. Tạo Order + OrderItems (snapshot giá)
   * 5. Publish SQS event
   * 6. Clear cart
   */
  async checkout(userId: string, dto: CreateCheckoutDto, token: string): Promise<OrderWithItems> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống');
    }

    // Step 1: Fetch all products từ Product Service và verify stock
    const productMap = new Map();
    let totalAmount = 0;

    for (const item of dto.items) {
      try {
        const product = await this.productService.getProduct(item.productId);
        
        // Verify stock
        if (product.stockQty < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" chỉ còn ${product.stockQty} cái (yêu cầu ${item.quantity})`,
          );
        }

        productMap.set(item.productId, product);
        totalAmount += product.price * item.quantity;
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(`Lỗi kiểm tra sản phẩm ${item.productId}`);
      }
    }

    // Step 2: Decrement stock trên Product Service
    // Nếu bất kỳ decrement nào fail, throw exception → transaction rollback (ideally)
    for (const item of dto.items) {
      try {
        await this.productService.decrementStock(item.productId, item.quantity, token);
      } catch (error) {
        // Nếu fail ở đây, trong production cần implement rollback
        // Cho MVP: just throw và client retry checkout
        this.logger.error(`Lỗi giảm stock ${item.productId}: ${error.message}`);
        throw new BadRequestException(`Không thể cập nhật stock sản phẩm ${item.productId}`);
      }
    }

    // Step 3: Tạo Order
    const order = this.orderRepo.create({
      userId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      items: [],
    });

    const savedOrder = await this.orderRepo.save(order);

    // Step 4: Tạo OrderItems (snapshot giá)
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      return this.orderItemRepo.create({
        orderId: savedOrder.id,
        productId: item.productId,
        productName: product.name,
        productSlug: product.slug,
        unitPrice: product.price,
        quantity: item.quantity,
      });
    });

    const savedItems = await this.orderItemRepo.save(orderItems);
    savedOrder.items = savedItems;

    // Step 5: Publish SQS event (fire-and-forget)
    await this.eventPublisher.publishOrderCreated({
      orderId: savedOrder.id,
      userId,
      totalAmount,
      createdAt: savedOrder.createdAt.toISOString(),
      paymentMethod: dto.paymentMethod,
    });

    // Step 6: Clear cart từ Redis
    await this.redisService.clearCart(userId);

    return this.toOrderWithItems(savedOrder);
  }

  /**
   * Lấy danh sách đơn hàng của user (có pagination + filter)
   */
  async findAllByUser(userId: string, query: QueryOrderDto): Promise<{
    data: OrderWithItems[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    let qb = this.orderRepo
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    // Apply filters nếu có
    if (query.status) {
      qb = qb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.paymentStatus) {
      qb = qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    const [orders, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders.map((order) => this.toOrderWithItems(order)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy chi tiết 1 đơn hàng
   */
  async findOneById(orderId: string, userId?: string): Promise<OrderWithItems> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, ...(userId && { userId }) },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    return this.toOrderWithItems(order);
  }

  /**
   * Cập nhật trạng thái đơn hàng (admin only)
   */
  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<OrderWithItems> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    order.status = newStatus;
    const updated = await this.orderRepo.save(order);

    return this.toOrderWithItems(updated);
  }

  /**
   * Cập nhật trạng thái thanh toán (dùng bởi Payment Service thông qua SNS)
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, paymentRef?: string): Promise<void> {
    await this.orderRepo.update(
      { id: orderId },
      { paymentStatus, paymentRef: paymentRef || undefined },
    );

    // Tự động cập nhật order status = confirmed khi payment paid
    if (paymentStatus === PaymentStatus.PAID) {
      await this.orderRepo.update(
        { id: orderId },
        { status: OrderStatus.CONFIRMED },
      );
    }
  }

  /**
   * Convert entity to DTO response
   */
  private toOrderWithItems(order: Order): OrderWithItems {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
