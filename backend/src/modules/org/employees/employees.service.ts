import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmployeesRepository } from './employees.repository';
import { PromoteEmployeeDto } from './employees.dto';
import { ActivityLogService } from '../../activity-log/activity-log.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  constructor(
    private readonly repository: EmployeesRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async findAll(query: any) {
    return this.repository.findAll({
      department: query.department,
      role: query.role,
      status: query.status,
      search: query.q,
    });
  }

  async findOne(id: string) {
    const employee = await this.repository.findOne(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: any) {
    const employee = await this.repository.findOne(id);
    if (!employee) throw new NotFoundException('Employee not found');

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.status) updateData.status = dto.status;

    return this.repository.update(id, updateData);
  }

  /**
   * POST /org/employees/:id/promote
   * THE ONLY endpoint that can change an employee's role.
   * Writes an activity_log entry with action='ROLE_PROMOTED' (Spec 02 §2.3).
   */
  async promote(id: string, dto: PromoteEmployeeDto, actor?: any) {
    const employee = await this.repository.findOne(id);
    if (!employee) throw new NotFoundException('Employee not found');

    const oldRole = employee.role;
    const result = await this.repository.update(id, { role: dto.newRole } as any);

    // Log the role change
    await this.activityLogService.log(
      actor?.id || null,
      'ROLE_PROMOTED',
      'employee',
      id,
      { oldRole, newRole: dto.newRole },
    );

    this.logger.log(`Promoted employee ${id} from ${oldRole} to ${dto.newRole}`);
    return result;
  }
}
