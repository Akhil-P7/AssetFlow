import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Roles, RefetchRole } from '../../../common/decorators';

/** Employee Directory + Role Promotion — Spec 02 §2.3 */
@Controller('org/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  /**
   * POST /org/employees/:id/promote
   * THE ONLY ENDPOINT that can change an employee's role.
   * Admin-only, refetch=true (Spec 04 §3).
   */
  @Post(':id/promote')
  @Roles('ADMIN')
  @RefetchRole()
  promote(@Param('id') id: string, @Body() dto: any) { return this.service.promote(id, dto); }
}
