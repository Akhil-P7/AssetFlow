import { Injectable, Logger } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { DashboardKpis } from './dashboard.dto';

/**
 * Dashboard service — computes KPIs server-side per request, scoped by role.
 * Each KPI is its own query, not derived client-side (Spec 03 §7).
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(private readonly repository: DashboardRepository) {}

  async getKpis(actor: any): Promise<DashboardKpis> {
    const [
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturns,
      totalAssets,
    ] = await Promise.all([
      this.repository.countAssetsByStatus('AVAILABLE'),
      this.repository.countAssetsByStatus('ALLOCATED'),
      this.repository.countMaintenanceToday(),
      this.repository.countActiveBookings(),
      this.repository.countPendingTransfers(),
      this.repository.countUpcomingReturns(),
      this.repository.countOverdueReturns(),
      this.repository.countTotalAssets(),
    ]);

    return {
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturns,
      totalAssets,
    };
  }
}
