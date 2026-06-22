import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { RedisService } from '../common/redis.service';
import { ProductService } from '../common/product.service';
import { EventPublisherService } from '../common/event-publisher.service';

describe('OrdersService (Unit)', () => {
  let service: OrdersService;
  let orderRepo: Repository<Order>;
  let orderItemRepo: Repository<OrderItem>;
  let redisService: RedisService;
  let productService: ProductService;
  let eventPublisher: EventPublisherService;

  const mockOrderRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockOrderItemRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRedisService = {
    clearCart: jest.fn(),
  };

  const mockProductService = {
    getProduct: jest.fn(),
    decrementStock: jest.fn(),
  };

  const mockEventPublisher = {
    publishOrderCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: EventPublisherService,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
    orderItemRepo = module.get(getRepositoryToken(OrderItem));
    redisService = module.get<RedisService>(RedisService);
    productService = module.get<ProductService>(ProductService);
    eventPublisher = module.get<EventPublisherService>(EventPublisherService);

    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('should create order successfully', async () => {
      const userId = 'user-123';
      const token = 'jwt-token';
      const dto = {
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 },
        ],
        shippingAddress: {
          street: '123 Main St',
          ward: 'Ward 1',
          district: 'District 1',
          city: 'HCM',
          zipCode: '700000',
        },
        paymentMethod: 'vnpay',
      };

      const mockProduct1 = {
        id: 'product-1',
        name: 'Product 1',
        slug: 'product-1',
        price: 100000,
        stockQty: 10,
      };

      const mockProduct2 = {
        id: 'product-2',
        name: 'Product 2',
        slug: 'product-2',
        price: 200000,
        stockQty: 5,
      };

      const mockOrder = {
        id: 'order-123',
        userId,
        status: OrderStatus.PENDING,
        totalAmount: 400000,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(productService, 'getProduct')
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);

      jest.spyOn(productService, 'decrementStock')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      jest.spyOn(orderRepo, 'create').mockReturnValue(mockOrder as any);
      jest.spyOn(orderRepo, 'save').mockResolvedValue(mockOrder as any);

      const mockItems = [
        {
          id: 'item-1',
          productId: 'product-1',
          productName: 'Product 1',
          productSlug: 'product-1',
          unitPrice: 100000,
          quantity: 2,
        },
        {
          id: 'item-2',
          productId: 'product-2',
          productName: 'Product 2',
          productSlug: 'product-2',
          unitPrice: 200000,
          quantity: 1,
        },
      ];

      jest.spyOn(orderItemRepo, 'create').mockReturnValue(mockItems as any);
      jest.spyOn(orderItemRepo, 'save').mockResolvedValue(mockItems as any);

      jest.spyOn(eventPublisher, 'publishOrderCreated').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'clearCart').mockResolvedValue(undefined);

      const result = await service.checkout(userId, dto, token);

      expect(productService.getProduct).toHaveBeenCalledTimes(2);
      expect(productService.decrementStock).toHaveBeenCalledTimes(2);
      expect(orderRepo.save).toHaveBeenCalled();
      expect(orderItemRepo.save).toHaveBeenCalled();
      expect(eventPublisher.publishOrderCreated).toHaveBeenCalled();
      expect(redisService.clearCart).toHaveBeenCalledWith(userId);
      expect(result.totalAmount).toBe(400000);
    });

    it('should throw error if product not found', async () => {
      const userId = 'user-123';
      const token = 'jwt-token';
      const dto = {
        items: [{ productId: 'non-existent', quantity: 1 }],
        shippingAddress: {
          street: '123 Main St',
          ward: 'Ward 1',
          district: 'District 1',
          city: 'HCM',
          zipCode: '700000',
        },
      };

      jest.spyOn(productService, 'getProduct').mockRejectedValue(
        new BadRequestException('Product not found'),
      );

      await expect(service.checkout(userId, dto, token)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if stock insufficient', async () => {
      const userId = 'user-123';
      const token = 'jwt-token';
      const dto = {
        items: [{ productId: 'product-1', quantity: 100 }],
        shippingAddress: {
          street: '123 Main St',
          ward: 'Ward 1',
          district: 'District 1',
          city: 'HCM',
          zipCode: '700000',
        },
      };

      const mockProduct = {
        id: 'product-1',
        name: 'Product 1',
        slug: 'product-1',
        price: 100000,
        stockQty: 5,
      };

      jest.spyOn(productService, 'getProduct').mockResolvedValue(mockProduct);

      await expect(service.checkout(userId, dto, token)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if cart is empty', async () => {
      const userId = 'user-123';
      const token = 'jwt-token';
      const dto = {
        items: [],
        shippingAddress: {
          street: '123 Main St',
          ward: 'Ward 1',
          district: 'District 1',
          city: 'HCM',
          zipCode: '700000',
        },
      };

      await expect(service.checkout(userId, dto, token)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneById', () => {
    it('should return order by id', async () => {
      const orderId = 'order-123';
      const userId = 'user-123';

      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
        totalAmount: 100000,
        paymentStatus: PaymentStatus.PENDING,
        shippingAddress: {},
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(orderRepo, 'findOne').mockResolvedValue(mockOrder as any);

      const result = await service.findOneById(orderId, userId);

      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: orderId, userId },
        relations: ['items'],
      });
      expect(result.id).toBe(orderId);
    });

    it('should throw NotFoundException if order not found', async () => {
      const orderId = 'non-existent';
      const userId = 'user-123';

      jest.spyOn(orderRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOneById(orderId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});
