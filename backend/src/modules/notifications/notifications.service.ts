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
    return [];
  }
  async markRead(id: string, actor: any) {
    throw new Error('Not implemented');
  }
  async markAllRead(actor: any) {
    throw new Error('Not implemented');
  }

  /** Called by other modules to create notifications */
  async create(recipientId: string, type: NotificationType, payload: Record<string, any>, tx?: EntityManager) {
    this.logger.log(`Creating notification of type ${type} for recipient ${recipientId}`);
    return this.repository.createNotification(recipientId, type, payload, tx);
  }
}
