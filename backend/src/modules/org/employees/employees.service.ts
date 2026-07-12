import { Injectable, Logger } from '@nestjs/common';
import { EmployeesRepository } from './employees.repository';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  constructor(private readonly repository: EmployeesRepository) {}

  async findAll(query: any) {
    /* TODO */ return [];
  }
  async findOne(id: string) {
    /* TODO */ return null;
  }
  async update(id: string, dto: any) {
    /* TODO */ return null;
  }
  async promote(id: string, dto: any) {
    /* TODO: Write activity_log entry with ROLE_PROMOTED */ return null;
  }
}
