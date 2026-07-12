import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles, CurrentUser } from '../../common/decorators';

/** Reports & Analytics — Spec 02 §8 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('utilization')
  @Roles('ADMIN', 'ASSET_MANAGER')
  getUtilization(@Query() query: any) { return this.service.getUtilization(query); }

  @Get('maintenance-frequency')
  @Roles('ADMIN', 'ASSET_MANAGER')
  getMaintenanceFrequency(@Query() query: any) { return this.service.getMaintenanceFrequency(query); }

  @Get('upcoming-lifecycle')
  @Roles('ADMIN', 'ASSET_MANAGER')
  getUpcomingLifecycle() { return this.service.getUpcomingLifecycle(); }

  @Get('department-allocation-summary')
  @Roles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD')
  getDepartmentSummary(@CurrentUser() user: any) { return this.service.getDepartmentSummary(user); }

  @Get('booking-heatmap')
  @Roles('ADMIN', 'ASSET_MANAGER')
  getBookingHeatmap() { return this.service.getBookingHeatmap(); }

  @Get(':reportName/export')
  @Roles('ADMIN', 'ASSET_MANAGER')
  exportReport(@Param('reportName') name: string, @Query('format') format: string, @Res() res: Response) {
    return this.service.exportReport(name, format, res);
  }
}