import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AssetsRepository {
  constructor(private readonly dataSource: DataSource) {}
  // TODO: Implement asset queries with GIN full-text search index
}
