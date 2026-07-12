import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import {
  ApiError,
  ErrorCodes,
} from '../../common/exceptions/api-error.exception';
import { NotificationType } from './notification.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(query: any, actor: any) {
    const status = query.unreadOnly === 'true' ? 'unread' : 'all';
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    return this.repository.findByRecipient(actor.id, status, page, limit);
  }

  async markRead(id: string, actor: any) {
    const notification = await this.repository.findOneByIdAndRecipient(id, actor.id);
    if (!notification) throw new NotFoundException('Notification not found');
    notification.readAt = new Date();
    return this.repository.save(notification);
  }

  async markAllRead(actor: any) {
    await this.repository.markAllAsRead(actor.id);
    return { success: true };
  }

  /** Called by other modules to create notifications */
  async create(
    recipientId: string,
    type: NotificationType,
    payload: Record<string, any>,
    tx?: EntityManager,
  ) {
    this.logger.log(
      `Creating notification of type ${type} for recipient ${recipientId}`,
    );
    return this.repository.createNotification(recipientId, type, payload, tx);
  }
}
