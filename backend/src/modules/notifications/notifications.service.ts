import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(query: any, actor: any) { return []; }
  async markRead(id: string, actor: any) { throw new Error('Not implemented'); }
  async markAllRead(actor: any) { throw new Error('Not implemented'); }

  /** Called by other modules to create notifications */
  async create(recipientId: string, type: string, payload: any, tx?: any) {
    throw new Error('Not implemented');
  }
}