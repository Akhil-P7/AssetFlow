import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { Employee } from '../org/employees/employee.entity';
import { Department } from '../org/departments/department.entity';

@Entity('allocation')
export class Allocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId?: string | null;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @CreateDateColumn({ name: 'allocated_at', type: 'timestamptz' })
  allocatedAt!: Date;

  @Column({ name: 'expected_return_date', type: 'date', nullable: true })
  expectedReturnDate?: string | null;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt?: Date | null;

  @Column({ name: 'return_condition_note', type: 'text', nullable: true })
  returnConditionNote?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status!: string; // 'ACTIVE' | 'CLOSED'

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee?: Employee | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  creator?: Employee;
}
