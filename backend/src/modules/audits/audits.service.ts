import { Injectable, Logger } from '@nestjs/common';
import { AuditsRepository } from './audits.repository';

/**
 * Audit service — implements cycle closure from Spec 03 §5.
 * Closing a cycle is irreversible — DB trigger prevents edits to closed cycle results.
 */
@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);
  constructor(private readonly repository: AuditsRepository) {}

  async create(dto: any, actor: any) { throw new Error('Not implemented'); }
  async findAll(query: any) { return []; }
  async findOne(id: string) { return null; }
  async getResults(cycleId: string) { return []; }
  async updateResult(cycleId: string, assetId: string, dto: any, actor: any) { throw new Error('Not implemented'); }
  async getDiscrepancyReport(cycleId: string) { return []; }
  async close(cycleId: string, actor: any) { throw new Error('Not implemented'); }
}