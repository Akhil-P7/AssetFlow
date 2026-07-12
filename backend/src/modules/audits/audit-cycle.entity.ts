import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Department } from '../org/departments/department.entity';
import { Employee } from '../org/employees/employee.entity';

@Entity('audit_cycle')
export class AuditCycle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'scope_department_id', type: 'uuid', nullable: true })
  scopeDepartmentId?: string | null;

  @Column({
    name: 'scope_location',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  scopeLocation?: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status!: string; // 'OPEN' | 'CLOSED'

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'scope_department_id' })
  department?: Department | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  creator?: Employee;
}
