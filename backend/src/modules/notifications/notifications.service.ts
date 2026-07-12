import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { ApiError, ErrorCodes } from '../../common/exceptions/api-error.exception';
import { NotificationType } from './notification.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(query: any, actor: any) {
    if (!actor || !actor.id) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 401, 'Authentication required');
    }
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const status = query.status || 'unread';

    return this.repository.findByRecipient(actor.id, status, page, limit);
  }

  async markRead(id: string, actor: any) {
    if (!actor || !actor.id) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 401, 'Authentication required');
    }
    const notification = await this.repository.findOneByIdAndRecipient(id, actor.id);
    if (!notification) {
      throw new ApiError(ErrorCodes.NOT_FOUND, 404, 'Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.repository.save(notification);
    }
    return notification;
  }

  async markAllRead(actor: any) {
    if (!actor || !actor.id) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 401, 'Authentication required');
    }
    await this.repository.markAllAsRead(actor.id);
    return { success: true };
  }

  /** Called by other modules to create notifications */
  async create(recipientId: string, type: NotificationType, payload: Record<string, any>, tx?: EntityManager) {
    this.logger.log(`Creating notification of type ${type} for recipient ${recipientId}`);
    return this.repository.createNotification(recipientId, type, payload, tx);
  }
}