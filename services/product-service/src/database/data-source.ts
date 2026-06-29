import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '', 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'product_db',
  entities: [Product, Category],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
