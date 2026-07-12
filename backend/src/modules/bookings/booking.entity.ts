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

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ name: 'booked_by', type: 'uuid' })
  bookedBy!: string;

  @Column({ name: 'booked_for_department_id', type: 'uuid', nullable: true })
  bookedForDepartmentId?: string | null;

  @Column({ name: 'time_range', type: 'tstzrange' })
  timeRange!: string; // stored as range, e.g. '[2026-07-12 10:00:00+00, 2026-07-12 11:00:00+00)'

  @Column({ type: 'varchar', length: 30, default: 'UPCOMING' })
  status!: string; // 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'resource_id' })
  resource?: Asset;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'booked_by' })
  booker?: Employee;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'booked_for_department_id' })
  department?: Department | null;
}
