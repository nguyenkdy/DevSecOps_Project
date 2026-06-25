import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { RedisService } from '../common/redis.service';

describe('CartService (Unit)', () => {
  let service: CartService;
  let redisService: RedisService;

  beforeEach(async () => {
    // Mock Redis Service
    const mockRedisService = {
      addToCart: jest.fn(),
      getCart: jest.fn(),
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      updateCartItemQuantity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    redisService = module.get<RedisService>(RedisService);
  });

  describe('addItem', () => {
    it('should add item to cart and return updated cart', async () => {
      const userId = 'user-123';
      const productId = 'product-456';
      const quantity = 2;
      const mockCart = [
        { productId, quantity, addedAt: Date.now() },
      ];

      jest.spyOn(redisService, 'addToCart').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'getCart').mockResolvedValue(mockCart);

      const result = await service.addItem(userId, productId, quantity);

      expect(redisService.addToCart).toHaveBeenCalledWith(userId, productId, quantity);
      expect(result).toEqual(mockCart);
    });
  });

  describe('getCart', () => {
    it('should return cart items', async () => {
      const userId = 'user-123';
      const mockCart = [
        { productId: 'product-1', quantity: 2, addedAt: Date.now() },
        { productId: 'product-2', quantity: 1, addedAt: Date.now() },
      ];

      jest.spyOn(redisService, 'getCart').mockResolvedValue(mockCart);

      const result = await service.getCart(userId);

      expect(redisService.getCart).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockCart);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when cart is empty', async () => {
      const userId = 'user-123';

      jest.spyOn(redisService, 'getCart').mockResolvedValue([]);

      const result = await service.getCart(userId);

      expect(result).toEqual([]);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const userId = 'user-123';
      const productId = 'product-456';
      const updatedCart = [];

      jest.spyOn(redisService, 'removeFromCart').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'getCart').mockResolvedValue(updatedCart);

      const result = await service.removeItem(userId, productId);

      expect(redisService.removeFromCart).toHaveBeenCalledWith(userId, productId);
      expect(result).toEqual(updatedCart);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      const userId = 'user-123';

      jest.spyOn(redisService, 'clearCart').mockResolvedValue(undefined);

      await service.clearCart(userId);

      expect(redisService.clearCart).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      const userId = 'user-123';
      const productId = 'product-456';
      const newQuantity = 5;
      const updatedCart = [
        { productId, quantity: newQuantity, addedAt: Date.now() },
      ];

      jest.spyOn(redisService, 'updateCartItemQuantity').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'getCart').mockResolvedValue(updatedCart);

      const result = await service.updateItemQuantity(userId, productId, newQuantity);

      expect(redisService.updateCartItemQuantity).toHaveBeenCalledWith(userId, productId, newQuantity);
      expect(result[0].quantity).toBe(newQuantity);
    });
  });
});
