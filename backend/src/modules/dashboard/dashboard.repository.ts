import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** KPI computation — Spec 02 §8 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly dataSource: DataSource) {}

  async countAssetsByStatus(status: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM asset WHERE status = $1`,
      [status],
    );
    return parseInt(result[0].count, 10);
  }

  async countMaintenanceToday(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM maintenance_request
       WHERE status IN ('PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS')
         AND created_at::date = CURRENT_DATE`,
    );
    return parseInt(result[0].count, 10);
  }

  async countActiveBookings(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM booking
       WHERE status IN ('UPCOMING', 'ONGOING')`,
    );
    return parseInt(result[0].count, 10);
  }

  async countPendingTransfers(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM transfer_request WHERE status = 'REQUESTED'`,
    );
    return parseInt(result[0].count, 10);
  }

  async countUpcomingReturns(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM allocation
       WHERE status = 'ACTIVE'
         AND expected_return_date IS NOT NULL
         AND expected_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
    );
    return parseInt(result[0].count, 10);
  }

  async countOverdueReturns(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM allocation
       WHERE status = 'ACTIVE'
         AND expected_return_date IS NOT NULL
         AND expected_return_date < CURRENT_DATE`,
    );
    return parseInt(result[0].count, 10);
  }
  async countTotalAssets(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM asset`,
    );
    return parseInt(result[0].count, 10);
  }
}
