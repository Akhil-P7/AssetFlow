import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { DepartmentsRepository } from './departments/departments.repository';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { CategoriesRepository } from './categories/categories.repository';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { EmployeesRepository } from './employees/employees.repository';

@Module({
  controllers: [
    DepartmentsController,
    CategoriesController,
    EmployeesController,
  ],
  providers: [
    DepartmentsService,
    DepartmentsRepository,
    CategoriesService,
    CategoriesRepository,
    EmployeesService,
    EmployeesRepository,
  ],
  exports: [DepartmentsService, CategoriesService, EmployeesService],
})
export class OrgModule {}
