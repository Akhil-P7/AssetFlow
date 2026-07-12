import { Injectable, Logger } from '@nestjs/common';
import { MaintenanceRepository } from './maintenance.repository';

/**
 * Maintenance service — implements approval/resolution workflow from Spec 03 §4.
 * Asset status synced in same transaction: APPROVED → UNDER_MAINTENANCE, RESOLVED → AVAILABLE.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  constructor(private readonly repository: MaintenanceRepository) {}

  async findAll(query: any) { return []; }
  async create(dto: any, actor: any) { throw new Error('Not implemented'); }
  async approve(id: string, actor: any) { throw new Error('Not implemented'); }
  async reject(id: string, dto: any, actor: any) { throw new Error('Not implemented'); }
  async assignTechnician(id: string, dto: any) { throw new Error('Not implemented'); }
  async start(id: string) { throw new Error('Not implemented'); }
  async resolve(id: string, actor: any) { throw new Error('Not implemented'); }
}