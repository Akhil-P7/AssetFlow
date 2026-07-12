import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from '../departments/department.entity';

@Entity('employee')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'EMPLOYEE' })
  role!: string; // 'EMPLOYEE' | 'DEPARTMENT_HEAD' | 'ASSET_MANAGER' | 'ADMIN'

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string; // 'ACTIVE' | 'INACTIVE'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;
}
