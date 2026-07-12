import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../employees/employee.entity';

@Entity('department')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'parent_department_id', type: 'uuid', nullable: true })
  parentDepartmentId?: string | null;

  @Column({ name: 'department_head_id', type: 'uuid', nullable: true })
  departmentHeadId?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string; // 'ACTIVE' | 'INACTIVE'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'parent_department_id' })
  parentDepartment?: Department | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'department_head_id' })
  departmentHead?: Employee | null;
}
