import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('asset_category')
export class AssetCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'custom_fields', type: 'jsonb', default: '[]' })
  customFields!: any[];

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string; // 'ACTIVE' | 'INACTIVE'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
