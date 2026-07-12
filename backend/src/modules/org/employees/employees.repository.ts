import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Employee } from './employee.entity';

@Injectable()
export class EmployeesRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filters: {
    department?: string;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const qb = this.dataSource
      .getRepository(Employee)
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .select([
        'emp.id',
        'emp.name',
        'emp.email',
        'emp.departmentId',
        'emp.role',
        'emp.status',
        'emp.createdAt',
        'emp.updatedAt',
        'dept.id',
        'dept.name',
      ])
      .orderBy('emp.name', 'ASC');

    if (filters.department) {
      qb.andWhere('emp.departmentId = :department', { department: filters.department });
    }
    if (filters.role) {
      qb.andWhere('emp.role = :role', { role: filters.role });
    }
    if (filters.status) {
      qb.andWhere('emp.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('(emp.name ILIKE :search OR emp.email ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    return this.dataSource
      .getRepository(Employee)
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .select([
        'emp.id',
        'emp.name',
        'emp.email',
        'emp.departmentId',
        'emp.role',
        'emp.status',
        'emp.createdAt',
        'emp.updatedAt',
        'dept.id',
        'dept.name',
      ])
      .where('emp.id = :id', { id })
      .getOne();
  }

  async update(id: string, data: Partial<Employee>) {
    const repo = this.dataSource.getRepository(Employee);
    await repo.update(id, data);
    return this.findOne(id);
  }
}
