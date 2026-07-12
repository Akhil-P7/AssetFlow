import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AssetCategory } from '../org/categories/category.entity';
import { Department } from '../org/departments/department.entity';

@Entity('asset')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'asset_tag', type: 'varchar', length: 20, unique: true })
  assetTag!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({
    name: 'serial_number',
    type: 'varchar',
    length: 120,
    unique: true,
    nullable: true,
  })
  serialNumber?: string | null;

  @Column({ name: 'acquisition_date', type: 'date', nullable: true })
  acquisitionDate?: string | null;

  @Column({
    name: 'acquisition_cost',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  acquisitionCost?: number | null;

  @Column({ type: 'varchar', length: 40, default: 'Good' })
  condition!: string; // 'Excellent' | 'Good' | 'Fair' | 'Poor'

  @Column({ type: 'varchar', length: 160, nullable: true })
  location?: string | null;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @Column({ name: 'is_bookable', type: 'boolean', default: false })
  isBookable!: boolean;

  @Column({ type: 'varchar', length: 30, default: 'AVAILABLE' })
  status!: string; // 'AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'

  @Column({ name: 'qr_code_url', type: 'text', nullable: true })
  qrCodeUrl?: string | null;

  @Column({ name: 'photo_urls', type: 'text', array: true, default: '{}' })
  photoUrls!: string[];

  @Column({ name: 'document_urls', type: 'text', array: true, default: '{}' })
  documentUrls!: string[];

  @Column({ name: 'custom_field_values', type: 'jsonb', default: '{}' })
  customFieldValues!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => AssetCategory)
  @JoinColumn({ name: 'category_id' })
  category?: AssetCategory;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;
}
