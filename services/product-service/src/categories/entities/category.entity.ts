import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Self-referential: category cha có thể chứa nhiều category con.
   * Ví dụ: "Thời trang" → "Áo", "Quần", "Giày"
   * parentId = null nghĩa là root category.
   */
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (c) => c.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (c) => c.parent)
  children: Category[];

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  slug: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
