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

@Entity('maintenance_request')
export class MaintenanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ name: 'raised_by', type: 'uuid' })
  raisedBy!: string;

  @Column({ name: 'issue_description', type: 'text' })
  issueDescription!: string;

  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  priority!: string; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status!: string; // 'PENDING' | 'APPROVED' | 'REJECTED' | 'TECHNICIAN_ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'technician_name', type: 'varchar', length: 120, nullable: true })
  technicianName?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'raised_by' })
  raiser?: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: Employee | null;
}
