import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../org/employees/employee.entity';

export type NotificationType =
  | 'ASSET_ASSIGNED'
  | 'ASSET_RETURNED'
  | 'MAINTENANCE_REQUESTED'
  | 'MAINTENANCE_APPROVED'
  | 'MAINTENANCE_COMPLETED'
  | 'AUDIT_INITIATED'
  | 'AUDIT_SUBMITTED'
  | 'AUDIT_OVERDUE';

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: Employee;

  @Column({
    type: 'varchar',
  })
  type: NotificationType;

  @Column({
    type: 'jsonb',
    default: '{}',
  })
  payload: Record<string, any>;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
