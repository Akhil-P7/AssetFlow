import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Departments DB queries */
@Injectable()
export class DepartmentsRepository {
  constructor(private readonly dataSource: DataSource) {}
  // TODO: Implement queries
}
