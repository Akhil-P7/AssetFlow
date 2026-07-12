import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Allocation } from './allocation.entity';
import { Asset } from '../assets/asset.entity';
import { Employee } from '../org/employees/employee.entity';
import { Department } from '../org/departments/department.entity';

@Entity('transfer_request')
export class TransferRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'allocation_id', type: 'uuid' })
  allocationId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy!: string;

  @Column({ name: 'to_employee_id', type: 'uuid', nullable: true })
  toEmployeeId?: string | null;

  @Column({ name: 'to_department_id', type: 'uuid', nullable: true })
  toDepartmentId?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'REQUESTED' })
  status!: string; // 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Allocation)
  @JoinColumn({ name: 'allocation_id' })
  allocation?: Allocation;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requested_by' })
  requester?: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'to_employee_id' })
  toEmployee?: Employee | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'to_department_id' })
  toDepartment?: Department | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: Employee | null;
}
