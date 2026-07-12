import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  constructor(private readonly repository: ReportsRepository) {}

  async getUtilization(query: any) {
    return this.repository.getUtilization(query.startDate, query.endDate);
  }

  async getMaintenanceFrequency(query: any) {
    return this.repository.getMaintenanceFrequency();
  }

  async getUpcomingLifecycle() {
    return this.repository.getUpcomingLifecycle();
  }

  async getDepartmentSummary(actor: any) {
    // Dept heads only see their own department
    const deptId = actor?.role === 'DEPARTMENT_HEAD' ? actor.departmentId : undefined;
    return this.repository.getDepartmentSummary(deptId);
  }

  async getBookingHeatmap() {
    return this.repository.getBookingHeatmap();
  }

  async exportReport(name: string, format: string, res: any) {
    const safeReportName = String(name ?? '').replace(/[^a-zA-Z0-9._-]/g, '_');

    // For now, since PDF generation requires heavier libraries (e.g. PDFKit),
    // and this is just the API integration step, we will mock a basic CSV export.
    if (format === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.attachment(`${safeReportName}-report.csv`);
      return res.send(
        `Status,Count\nAVAILABLE,12\nALLOCATED,34\nUNDER_MAINTENANCE,3`,
      );
    } else if (format === 'pdf') {
      // Mocking PDF return with a basic text file for demonstration
      res.header('Content-Type', 'application/pdf');
      res.attachment(`${safeReportName}-report.pdf`);
      return res.send(`%PDF-1.4... (Mock PDF Data for ${safeReportName})`);
    }

    return res.status(400).send({ error: 'Unsupported format' });
  }
}
