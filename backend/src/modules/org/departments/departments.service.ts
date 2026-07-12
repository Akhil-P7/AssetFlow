import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto, UpdateDepartmentDto, UpdateStatusDto } from './departments.dto';

/** Departments business logic — CRUD + hierarchy + soft delete */
@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);
  constructor(private readonly repository: DepartmentsRepository) {}

  async findAll(query: any) {
    return this.repository.findAll({ status: query.status });
  }

  async findOne(id: string) {
    const dept = await this.repository.findOne(id);
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    return this.repository.create({
      name: dto.name,
      parentDepartmentId: dto.parentDepartmentId || null,
      departmentHeadId: dto.departmentHeadId || null,
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.repository.findOne(id);
    if (!dept) throw new NotFoundException('Department not found');
    return this.repository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.parentDepartmentId !== undefined && { parentDepartmentId: dto.parentDepartmentId }),
      ...(dto.departmentHeadId !== undefined && { departmentHeadId: dto.departmentHeadId }),
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const dept = await this.repository.findOne(id);
    if (!dept) throw new NotFoundException('Department not found');
    return this.repository.update(id, { status: dto.status });
  }
}
