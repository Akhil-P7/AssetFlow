import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators';

/** Dashboard KPIs — Spec 02 §8. Each KPI is its own scoped server-side query. */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  getKpis(@CurrentUser() user: any) {
    return this.service.getKpis(user);
  }
}
