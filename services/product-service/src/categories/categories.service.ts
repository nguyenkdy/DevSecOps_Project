import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import slugify from 'slugify';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? slugify(dto.name, { lower: true, locale: 'vi', strict: true });

    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Slug "${slug}" đã tồn tại`);
    }
    const category = this.categoryRepo.create({ ...dto, slug });
    return this.categoryRepo.save(category);
  }

  /** Trả về toàn bộ cây category gồm cả children lồng nhau. */
  async findTree(): Promise<Category[]> {
    const roots = await this.categoryRepo.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { sortOrder: 'ASC' },
    });
    return roots;
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async findById(id: string): Promise<Category> {
    const cat = await this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    return cat;
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findById(id);
    await this.categoryRepo.remove(cat);
  }
}
