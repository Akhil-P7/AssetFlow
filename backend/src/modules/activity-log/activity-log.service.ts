import { Injectable, Logger } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';

/**
 * Activity Log service — append-only structured logging.
 * Every state-changing action in the system calls log() on this service.
 * The activity_log table has no UPDATE/DELETE grants — enforced at DB level (Spec 04 §8).
 */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  constructor(private readonly repository: ActivityLogRepository) {}

  async findAll(query: any, actor: any) { return []; }

  /** Called by all modules to log state-changing actions */
  async log(actorId: string | null, action: string, entityType: string, entityId: string, metadata: any, tx?: any) {
    throw new Error('Not implemented');
  }
}