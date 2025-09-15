import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Category } from '../../categories/entities/category.entity';
import { Subcategory } from '../../subcategories/entities/subcategory.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ name: 'subcategory_id' })
  subcategoryId: string;

  @Column()
  brand: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column('int')
  quantity: number;

  @Column({ name: 'default_supplier_id', nullable: true })
  defaultSupplierId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Subcategory)
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: Subcategory;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'default_supplier_id' })
  defaultSupplier: Supplier;
}
