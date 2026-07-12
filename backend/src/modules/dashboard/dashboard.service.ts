import { Injectable, Logger } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

/**
 * Dashboard service — computes KPIs server-side per request, scoped by role.
 * Each KPI is its own query, not derived client-side (Spec 03 §7).
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(private readonly repository: DashboardRepository) {}

  async getKpis(actor: any) {
    // TODO: Return { assetsAvailable, assetsAllocated, maintenanceToday,
    //   activeBookings, pendingTransfers, upcomingReturns, overdueReturns }
    return {};
  }
}
