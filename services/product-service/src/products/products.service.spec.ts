import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { UploadService } from '../upload/upload.service';

const mockProduct = (): Partial<Product> => ({
  id: 'prod-uuid-1',
  name: 'Áo thun nam',
  slug: 'ao-thun-nam',
  price: 250000,
  stockQty: 10,
  images: [],
  isActive: true,
  category: null,
  categoryId: null,
  description: null,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: any;
  let uploadService: jest.Mocked<UploadService>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            manager: {
              transaction: jest.fn(),
            },
          },
        },
        {
          provide: UploadService,
          useValue: {
            uploadImage: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get(getRepositoryToken(Product));
    uploadService = module.get(UploadService);

    jest.clearAllMocks();
    // Reset query builder mocks
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === 'function') jest.fn().mockReturnThis();
    });
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.addSelect.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
  });

  describe('create', () => {
    it('nên tạo sản phẩm và tự sinh slug từ tên', async () => {
      productRepo.findOne.mockResolvedValue(null);
      const product = mockProduct();
      productRepo.create.mockReturnValue(product);
      productRepo.save.mockResolvedValue(product);

      const result = await service.create({
        name: 'Áo thun nam',
        price: 250000,
        stockQty: 10,
      });

      const createCall = productRepo.create.mock.calls[0][0];
      expect(createCall.slug).toBeDefined();
      expect(createCall.slug).toMatch(/[a-z0-9-]+/); // slug không có dấu cách hay ký tự đặc biệt
      expect(result).toEqual(product);
    });

    it('nên dùng slug đã được truyền vào nếu có', async () => {
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct());
      productRepo.save.mockResolvedValue(mockProduct());

      await service.create({ name: 'Test', slug: 'custom-slug', price: 100000, stockQty: 1 });

      expect(productRepo.create.mock.calls[0][0].slug).toBe('custom-slug');
    });

    it('nên throw ConflictException khi slug đã tồn tại', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct()); // slug đã có

      await expect(
        service.create({ name: 'Áo thun nam', price: 250000, stockQty: 5 }),
      ).rejects.toThrow(ConflictException);

      expect(productRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('nên trả về danh sách sản phẩm có phân trang', async () => {
      const products = [mockProduct(), mockProduct()];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([products, 2]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('nên áp dụng full-text search khi có tham số search', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'áo thun', page: 1, limit: 20 });

      // Phải gọi andWhere với tsvector query
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('searchVector'),
        expect.objectContaining({ search: 'áo thun' }),
      );
    });

    it('nên lọc theo khoảng giá khi có minPrice và maxPrice', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ minPrice: 100000, maxPrice: 500000, page: 1, limit: 20 });

      const calls = mockQueryBuilder.andWhere.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.includes('price >= :minPrice'))).toBe(true);
      expect(calls.some((c) => c.includes('price <= :maxPrice'))).toBe(true);
    });
  });

  describe('findBySlug', () => {
    it('nên trả về sản phẩm khi slug tồn tại', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct());
      const result = await service.findBySlug('ao-thun-nam');
      expect(result.slug).toBe('ao-thun-nam');
    });

    it('nên throw NotFoundException khi slug không tồn tại', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.findBySlug('khong-ton-tai')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('nên soft delete (isActive = false) thay vì xoá cứng', async () => {
      const product = { ...mockProduct(), isActive: true };
      productRepo.findOne.mockResolvedValue(product);
      productRepo.save.mockResolvedValue({ ...product, isActive: false });

      await service.remove('prod-uuid-1');

      const savedArg = productRepo.save.mock.calls[0][0];
      expect(savedArg.isActive).toBe(false);
    });
  });

  describe('uploadImage', () => {
    it('nên upload ảnh lên S3 và thêm vào mảng images của product', async () => {
      const product = { ...mockProduct(), images: [] };
      productRepo.findOne.mockResolvedValue(product);
      uploadService.uploadImage.mockResolvedValue({
        key: 'products/uuid/img.jpg',
        url: 'https://cdn.test/products/uuid/img.jpg',
      });
      productRepo.save.mockResolvedValue({
        ...product,
        images: [{ key: 'products/uuid/img.jpg', url: 'https://cdn.test/products/uuid/img.jpg', isThumbnail: false }],
      });

      const result = await service.uploadImage(
        'prod-uuid-1',
        { mimetype: 'image/jpeg', size: 1000, buffer: Buffer.from('') } as any,
      );

      expect(uploadService.uploadImage).toHaveBeenCalled();
      expect(result.images).toHaveLength(1);
    });
  });

  describe('decrementStock', () => {
    it('nên throw BadRequestException khi stockQty không đủ', async () => {
      productRepo.manager.transaction.mockImplementation(async (fn: any) => {
        const em = {
          createQueryBuilder: jest.fn().mockReturnValue({
            ...mockQueryBuilder,
            getOne: jest.fn().mockResolvedValue({ ...mockProduct(), stockQty: 3 }),
          }),
          save: jest.fn(),
        };
        return fn(em);
      });

      await expect(service.decrementStock('prod-uuid-1', 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên giảm stock đúng số lượng trong transaction', async () => {
      let savedProduct: any;
      productRepo.manager.transaction.mockImplementation(async (fn: any) => {
        const em = {
          createQueryBuilder: jest.fn().mockReturnValue({
            ...mockQueryBuilder,
            getOne: jest.fn().mockResolvedValue({ ...mockProduct(), stockQty: 10 }),
          }),
          save: jest.fn().mockImplementation((p) => { savedProduct = p; }),
        };
        return fn(em);
      });

      await service.decrementStock('prod-uuid-1', 3);

      expect(savedProduct.stockQty).toBe(7);
    });
  });
});
