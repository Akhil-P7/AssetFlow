import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Resource booking, overlap prevention — Spec 02 §5 */
@Injectable()
export class BookingsRepository {
  constructor(private readonly dataSource: DataSource) {}
  // TODO: Implement database queries
}
