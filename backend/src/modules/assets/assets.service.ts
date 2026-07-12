import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AssetsRepository } from './assets.repository';
import { assertValidTransition, AssetStatus } from '../../shared/state-machine/asset-transitions';
import { DataSource } from 'typeorm';
import { Asset } from './asset.entity';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { CreateAssetDto, UpdateAssetDto } from './assets.dto';

/**
 * Assets service — owns asset registration, search, and the ONLY
 * public entry point for changing asset.status (transitionStatus).
 */
@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  constructor(
    private readonly repository: AssetsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: any, actor: any) {
    // Basic search filtering (stubbed for mock)
    return this.dataSource.getRepository(Asset).find();
  }

  async findOne(id: string) {
    const asset = await this.dataSource.getRepository(Asset).findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async getHistory(id: string) {
    return []; // Stub
  }

  async findByTag(tag: string) {
    const asset = await this.dataSource.getRepository(Asset).findOne({ where: { assetTag: tag } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(dto: CreateAssetDto, actor: any) {
    const repo = this.dataSource.getRepository(Asset);
    // Generate an asset tag and mock QR url
    const assetTag = 'AF-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const asset = repo.create({
      ...dto,
      assetTag,
      qrCodeUrl: `https://api.assetflow.io/qr/${assetTag}`,
      status: 'AVAILABLE', // Defaults to AVAILABLE
    });
    return repo.save(asset);
  }

  async update(id: string, dto: UpdateAssetDto) {
    const repo = this.dataSource.getRepository(Asset);
    const asset = await repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    // Status is intentionally excluded from the UpdateAssetDto (enforced by validation)
    Object.assign(asset, dto);
    return repo.save(asset);
  }

  /**
   * The ONLY function allowed to update asset.status.
   * Called by this module's controller AND by other modules' services.
   * Validates the transition against the state machine first.
   */
  async transitionStatus(assetId: string, toStatus: AssetStatus, event: string, actorRole: string, reason?: string, tx?: any) {
    this.logger.log(`Transitioning asset ${assetId} status to ${toStatus} via ${event}`);
    const queryRunner = tx || this.dataSource.createQueryRunner();
    
    if (!tx) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      // Row-level lock the asset
      const asset = await queryRunner.manager.getRepository(Asset)
        .createQueryBuilder('asset')
        .where('asset.id = :assetId', { assetId })
        .setLock('pessimistic_write')
        .getOne();

      if (!asset) throw new NotFoundException('Asset not found');

      assertValidTransition(asset.status as AssetStatus, toStatus, event, actorRole);

      asset.status = toStatus;
      await queryRunner.manager.save(asset);
      
      // Optionally log manual overrides in activity log here if reason is provided
      
      if (!tx) await queryRunner.commitTransaction();
      return asset;
    } catch (err) {
      if (!tx) await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      if (!tx) await queryRunner.release();
    }
  }
}
