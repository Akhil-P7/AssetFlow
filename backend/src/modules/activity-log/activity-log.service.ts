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

  /**
   * List activity log entries, scoped by the caller's role:
   * - ADMIN: sees all
   * - ASSET_MANAGER / DEPARTMENT_HEAD: sees actions in their scope
   * - EMPLOYEE: sees only their own actions
   */
  async findAll(query: any, actor: any) {
    const filters: any = {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    };

    if (query.entityType) filters.entityType = query.entityType;
    if (query.entityId) filters.entityId = query.entityId;

    // Role-based scoping (Spec 03 §7)
    if (actor && actor.role === 'EMPLOYEE') {
      filters.actorId = actor.id;
    } else if (query.actorId) {
      filters.actorId = query.actorId;
    }

    return this.repository.findAll(filters);
  }

  /**
   * Called by all modules to log state-changing actions.
   * Accepts optional transaction manager to participate in the same
   * DB transaction as the action being logged.
   */
  async log(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata: any,
    tx?: any,
  ) {
    this.logger.debug(`Logging: ${action} on ${entityType}/${entityId}`);
    return this.repository.create(actorId, action, entityType, entityId, metadata || {}, tx);
  }
}
