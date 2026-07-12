import { Injectable } from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsRepository {
  private readonly repository: Repository<Notification>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Notification);
  }

  async findByRecipient(
    recipientId: string,
    status: 'read' | 'unread' | 'all' = 'unread',
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.recipientId = :recipientId', { recipientId })
      .orderBy('notification.createdAt', 'DESC');

    if (status === 'read') {
      query.andWhere('notification.readAt IS NOT NULL');
    } else if (status === 'unread') {
      query.andWhere('notification.readAt IS NULL');
    }

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOneByIdAndRecipient(
    id: string,
    recipientId: string,
  ): Promise<Notification | null> {
    return this.repository.findOne({
      where: { id, recipientId },
    });
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('recipientId = :recipientId AND readAt IS NULL', { recipientId })
      .execute();
  }

  async createNotification(
    recipientId: string,
    type: NotificationType,
    payload: Record<string, any>,
    manager?: EntityManager,
  ): Promise<Notification> {
    const repo = manager
      ? manager.getRepository(Notification)
      : this.repository;
    const notification = repo.create({
      recipientId,
      type,
      payload,
    });
    return repo.save(notification);
  }
}
