import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class EmployeesRepository {
  constructor(private readonly dataSource: DataSource) {}
}
