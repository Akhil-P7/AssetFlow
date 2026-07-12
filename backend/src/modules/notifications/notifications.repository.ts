import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** In-app notifications — Spec 02 §9 */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly dataSource: DataSource) {}
  // TODO: Implement database queries
}
