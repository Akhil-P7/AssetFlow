import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Analytics and report generation — Spec 02 §8 */
@Injectable()
export class ReportsRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Most-used vs idle assets over a date range */
  async getUtilization(startDate?: string, endDate?: string) {
    return this.dataSource.query(`
      SELECT
        a.id,
        a.asset_tag,
        a.name,
        a.status,
        COUNT(DISTINCT alloc.id) as allocation_count,
        COUNT(DISTINCT b.id) as booking_count,
        (COUNT(DISTINCT alloc.id) + COUNT(DISTINCT b.id)) as total_usage
      FROM asset a
      LEFT JOIN allocation alloc ON alloc.asset_id = a.id
      LEFT JOIN booking b ON b.resource_id = a.id
      GROUP BY a.id, a.asset_tag, a.name, a.status
      ORDER BY total_usage DESC
      LIMIT 50
    `);
  }

  /** Maintenance requests grouped by asset/category */
  async getMaintenanceFrequency() {
    return this.dataSource.query(`
      SELECT
        a.id as asset_id,
        a.asset_tag,
        a.name as asset_name,
        c.name as category_name,
        COUNT(mr.id) as request_count,
        COUNT(CASE WHEN mr.status = 'RESOLVED' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN mr.status IN ('PENDING', 'APPROVED', 'IN_PROGRESS') THEN 1 END) as open_count
      FROM asset a
      JOIN asset_category c ON c.id = a.category_id
      LEFT JOIN maintenance_request mr ON mr.asset_id = a.id
      GROUP BY a.id, a.asset_tag, a.name, c.name
      HAVING COUNT(mr.id) > 0
      ORDER BY request_count DESC
    `);
  }

  /** Assets due for maintenance or nearing retirement */
  async getUpcomingLifecycle() {
    return this.dataSource.query(`
      SELECT
        a.id,
        a.asset_tag,
        a.name,
        a.condition,
        a.acquisition_date,
        a.status,
        EXTRACT(YEAR FROM age(NOW(), a.acquisition_date::timestamp)) as age_years
      FROM asset a
      WHERE a.status NOT IN ('RETIRED', 'DISPOSED')
        AND a.acquisition_date IS NOT NULL
      ORDER BY a.acquisition_date ASC
      LIMIT 50
    `);
  }

  /** Counts + value by department */
  async getDepartmentSummary(departmentId?: string) {
    let query = `
      SELECT
        d.id as department_id,
        d.name as department_name,
        COUNT(a.id) as asset_count,
        COALESCE(SUM(a.acquisition_cost), 0) as total_value,
        COUNT(CASE WHEN a.status = 'AVAILABLE' THEN 1 END) as available_count,
        COUNT(CASE WHEN a.status = 'ALLOCATED' THEN 1 END) as allocated_count
      FROM department d
      LEFT JOIN asset a ON a.department_id = d.id
    `;

    const params: any[] = [];
    if (departmentId) {
      query += ` WHERE d.id = $1`;
      params.push(departmentId);
    }

    query += ` GROUP BY d.id, d.name ORDER BY d.name`;
    return this.dataSource.query(query, params);
  }

  /** Aggregated booking density by hour/day */
  async getBookingHeatmap() {
    return this.dataSource.query(`
      SELECT
        EXTRACT(DOW FROM lower(time_range)) as day_of_week,
        EXTRACT(HOUR FROM lower(time_range)) as hour,
        COUNT(*) as booking_count
      FROM booking
      WHERE status IN ('UPCOMING', 'ONGOING', 'COMPLETED')
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `);
  }
}
