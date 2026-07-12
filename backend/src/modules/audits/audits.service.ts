import { Injectable, Logger } from '@nestjs/common';
import { AuditsRepository } from './audits.repository';
import { ApiError } from '../../common/exceptions/api-error.exception';

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);
  constructor(private readonly repository: AuditsRepository) {}

  async create(dto: any, actor: any) {
    return this.repository.createCycleWithEntries({
      ...dto,
      createdBy: actor.id,
      status: 'OPEN',
    });
  }

  async findAll(query: any) {
    return this.repository.findAllCycles(query);
  }

  async findOne(id: string) {
    return this.repository.findCycleById(id);
  }

  async getResults(cycleId: string) {
    return this.repository.getResults(cycleId);
  }

  async updateResult(cycleId: string, assetId: string, dto: any, actor: any) {
    const cycle = await this.repository.findCycleById(cycleId);
    if (!cycle || cycle.status !== 'OPEN') {
      throw new ApiError('BAD_REQUEST', 400, 'Audit cycle is not open');
    }

    await this.repository.updateResult(cycleId, assetId, {
      ...dto,
      verifiedById: actor.id,
      verifiedAt: new Date(),
    });
    return { success: true };
  }

  async getDiscrepancyReport(cycleId: string) {
    const results = await this.repository.getResults(cycleId);

    const missing = results.filter(
      (r) => r.result === 'MISSING' || r.result === 'PENDING',
    );
    const damaged = results.filter((r) => r.result === 'DAMAGED');
    const verified = results.filter((r) => r.result === 'VERIFIED');

    return {
      total: results.length,
      verifiedCount: verified.length,
      missingCount: missing.length,
      damagedCount: damaged.length,
      discrepancies: [...missing, ...damaged],
    };
  }

  async close(cycleId: string, actor: any) {
    const cycle = await this.repository.findCycleById(cycleId);
    if (!cycle || cycle.status !== 'OPEN') {
      throw new ApiError('BAD_REQUEST', 400, 'Audit cycle is not open');
    }

    // Identify assets that are actually confirmed missing by the verifiers
    const results = await this.repository.getResults(cycleId);
    const confirmedMissingAssetIds = results
      .filter((r) => r.result === 'MISSING' || r.result === 'PENDING')
      .map((r) => r.assetId);

    // Call the repo to close the cycle and transition those assets to 'LOST'
    await this.repository.closeCycle(cycleId, confirmedMissingAssetIds);
    return { success: true };
  }
}
