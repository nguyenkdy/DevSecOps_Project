import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import slugify from 'slugify';
import { Product, ProductImage } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UploadService } from '../upload/upload.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const slug = dto.slug ?? this.generateSlug(dto.name);

    const existing = await this.productRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Slug "${slug}" đã tồn tại`);
    }

    const product = this.productRepo.create({ ...dto, slug });
    return this.productRepo.save(product);
  }

  /**
   * Tìm kiếm và lọc sản phẩm với phân trang.
   *
   * Khi có `search`, dùng PostgreSQL full-text search với tsvector.
   * Trigger DB tự cập nhật searchVector khi INSERT/UPDATE product.
   * Hỗ trợ tiếng Việt không dấu nhờ `unaccent` extension.
   */
  async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
    const { search, categoryId, minPrice, maxPrice, inStock, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const qb: SelectQueryBuilder<Product> = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.isActive = true');

    if (search && search.trim()) {
      // plainto_tsquery tự xử lý input không cần escape
      qb.andWhere(
        `p.searchVector @@ plainto_tsquery('vietnamese_unaccent', unaccent(:search))`,
        { search: search.trim() },
      ).addSelect(
        `ts_rank(p.searchVector, plainto_tsquery('vietnamese_unaccent', unaccent(:search)))`,
        'rank',
      ).orderBy('rank', 'DESC');
    }

    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }
    if (minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice });
    }
    if (inStock) {
      qb.andWhere('p.stockQty > 0');
    }

    if (!search) {
      // Chỉ sort theo field khi không có search (search tự sort theo rank)
      const allowedSorts = ['price', 'createdAt', 'name'];
      const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
      qb.orderBy(`p.${safeSort}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slugOrId: string): Promise<Product> {
    // Order-service gọi bằng UUID, frontend gọi bằng slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    if (isUuid) {
      return this.findById(slugOrId);
    }
    const product = await this.productRepo.findOne({
      where: { slug: slugOrId, isActive: true },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    if (dto.name && !dto.slug) {
      dto.slug = this.generateSlug(dto.name);
    }
    if (dto.slug && dto.slug !== product.slug) {
      const existing = await this.productRepo.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" đã tồn tại`);
      }
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    // Soft delete: đặt isActive = false thay vì xoá thật
    product.isActive = false;
    await this.productRepo.save(product);
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File,
    isThumbnail = false,
  ): Promise<Product> {
    const product = await this.findById(id);

    const { key, url } = await this.uploadService.uploadImage(file, `products/${id}`);

    const newImage: ProductImage = { key, url, isThumbnail };

    // Nếu đặt làm thumbnail, bỏ thumbnail cũ
    if (isThumbnail) {
      product.images = product.images.map((img) => ({ ...img, isThumbnail: false }));
    }
    product.images = [...product.images, newImage];

    return this.productRepo.save(product);
  }

  async deleteImage(id: string, imageKey: string): Promise<Product> {
    const product = await this.findById(id);
    const imageToDelete = product.images.find((img) => img.key === imageKey);
    if (!imageToDelete) {
      throw new NotFoundException('Không tìm thấy ảnh');
    }

    await this.uploadService.deleteImage(imageKey);
    product.images = product.images.filter((img) => img.key !== imageKey);
    return this.productRepo.save(product);
  }

  /**
   * Giảm stock khi có đơn hàng. Được gọi từ Order Service qua HTTP.
   * Dùng SELECT FOR UPDATE để tránh race condition khi nhiều request cùng lúc.
   */
  async decrementStock(id: string, quantity: number): Promise<void> {
    await this.productRepo.manager.transaction(async (em) => {
      const product = await em
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id })
        .getOne();

      if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
      if (product.stockQty < quantity) {
        throw new BadRequestException(
          `Không đủ hàng. Tồn kho: ${product.stockQty}, yêu cầu: ${quantity}`,
        );
      }
      product.stockQty -= quantity;
      await em.save(product);
    });
  }

  private generateSlug(name: string): string {
    return slugify(name, { lower: true, locale: 'vi', strict: true });
  }
}
