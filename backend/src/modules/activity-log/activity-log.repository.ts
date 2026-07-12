import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ActivityLog } from './activity-log.entity';

/** Append-only activity logging — Spec 02 §9 */
@Injectable()
export class ActivityLogRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Creates a new activity log entry. Supports optional EntityManager
   * for transactional writes (e.g., when logging within the same tx
   * as an allocation or maintenance state change).
   */
  async create(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any>,
    tx?: any,
  ): Promise<ActivityLog> {
    const repo = tx
      ? tx.getRepository(ActivityLog)
      : this.dataSource.getRepository(ActivityLog);

    const entry = repo.create({
      actorId,
      action,
      entityType,
      entityId,
      metadata,
    });
    return repo.save(entry);
  }

  /**
   * Find activity log entries with optional filters.
   * Scoped by role at the service layer.
   */
  async findAll(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ActivityLog[]; total: number }> {
    const repo = this.dataSource.getRepository(ActivityLog);
    const qb = repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (filters.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    }
    if (filters.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: filters.entityId });
    }
    if (filters.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: filters.actorId });
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
