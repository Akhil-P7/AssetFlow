import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Department } from './department.entity';

/** Departments DB queries */
@Injectable()
export class DepartmentsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filters: { status?: string }) {
    const repo = this.dataSource.getRepository(Department);
    const qb = repo
      .createQueryBuilder('dept')
      .leftJoinAndSelect('dept.parentDepartment', 'parent')
      .leftJoinAndSelect('dept.departmentHead', 'head')
      .orderBy('dept.name', 'ASC');

    if (filters.status) {
      qb.where('dept.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    return this.dataSource
      .getRepository(Department)
      .createQueryBuilder('dept')
      .leftJoinAndSelect('dept.parentDepartment', 'parent')
      .leftJoinAndSelect('dept.departmentHead', 'head')
      .where('dept.id = :id', { id })
      .getOne();
  }

  async create(data: Partial<Department>) {
    const repo = this.dataSource.getRepository(Department);
    const dept = repo.create(data);
    return repo.save(dept);
  }

  async update(id: string, data: Partial<Department>) {
    const repo = this.dataSource.getRepository(Department);
    await repo.update(id, data);
    return this.findOne(id);
  }
}
