import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly dataSource: DataSource) {}
}
