import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AuditCycle } from './audit-cycle.entity';
import { Asset } from '../assets/asset.entity';
import { Employee } from '../org/employees/employee.entity';

@Entity('audit_result')
@Unique(['auditCycleId', 'assetId'])
export class AuditResultEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'audit_cycle_id', type: 'uuid' })
  auditCycleId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  result!: string; // 'VERIFIED' | 'MISSING' | 'DAMAGED' | 'PENDING'

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedById?: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @ManyToOne(() => AuditCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_cycle_id' })
  auditCycle?: AuditCycle;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier?: Employee | null;
}
