import { Injectable, Logger } from '@nestjs/common';
import { AssetsRepository } from './assets.repository';
import { assertValidTransition } from '../../shared/state-machine';

/**
 * Assets service — owns asset registration, search, and the ONLY
 * public entry point for changing asset.status (transitionStatus).
 *
 * Other modules (allocations, maintenance, audits) call transitionStatus()
 * to change asset status — they never write asset.status directly.
 * This guarantees the state-machine table is always enforced.
 * See Spec 05 §2 for the cross-module interaction pattern.
 */
@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  constructor(private readonly repository: AssetsRepository) {}

  async findAll(query: any) { /* TODO */ return []; }
  async findOne(id: string) { /* TODO */ return null; }
  async getHistory(id: string) { /* TODO */ return []; }
  async findByTag(tag: string) { /* TODO */ return null; }
  async create(dto: any, actor: any) { /* TODO: Auto-generate asset_tag, QR code */ return null; }
  async update(id: string, dto: any) { /* TODO: Status intentionally excluded */ return null; }

  /**
   * The ONLY function allowed to update asset.status.
   * Called by this module's controller AND by other modules' services.
   * Validates the transition against the state machine first.
   */
  async transitionStatus(assetId: string, dto: any, actor: any, tx?: any) {
    // TODO: Implement — load asset, call assertValidTransition, update status
    this.logger.log(`Transitioning asset ${assetId} status`);
    throw new Error('Not implemented');
  }
}
