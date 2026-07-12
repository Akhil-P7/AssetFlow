import { Injectable } from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { AuditCycle } from './audit-cycle.entity';
import { AuditResultEntry } from './audit-result-entry.entity';
import { Asset } from '../assets/asset.entity';

@Injectable()
export class AuditsRepository {
  private cycleRepo: Repository<AuditCycle>;
  private resultRepo: Repository<AuditResultEntry>;
  private assetRepo: Repository<Asset>;

  constructor(private readonly dataSource: DataSource) {
    this.cycleRepo = this.dataSource.getRepository(AuditCycle);
    this.resultRepo = this.dataSource.getRepository(AuditResultEntry);
    this.assetRepo = this.dataSource.getRepository(Asset);
  }

  async findAllCycles(query: any): Promise<AuditCycle[]> {
    return this.cycleRepo.find({
      relations: { department: true, creator: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findCycleById(id: string): Promise<AuditCycle | null> {
    return this.cycleRepo.findOne({ where: { id } });
  }

  async getResults(cycleId: string): Promise<AuditResultEntry[]> {
    return this.resultRepo.find({
      where: { auditCycleId: cycleId },
      relations: { asset: true, verifier: true },
    });
  }

  // Create a cycle and automatically generate PENDING entries for all matching assets
  async createCycleWithEntries(data: Partial<AuditCycle>): Promise<AuditCycle> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // Create the cycle
      const cycle = manager.create(AuditCycle, data);
      await manager.save(cycle);

      // Find matching assets
      const queryBuilder = manager.createQueryBuilder(Asset, 'asset');
      if (cycle.scopeDepartmentId) {
        queryBuilder.where('asset.departmentId = :deptId', {
          deptId: cycle.scopeDepartmentId,
        });
      }
      if (cycle.scopeLocation) {
        queryBuilder.andWhere('asset.location = :loc', {
          loc: cycle.scopeLocation,
        });
      }
      const assets = await queryBuilder.getMany();

      // Generate entries
      const entries = assets.map((a) =>
        manager.create(AuditResultEntry, {
          auditCycleId: cycle.id,
          assetId: a.id,
          result: 'PENDING',
        }),
      );
      if (entries.length > 0) {
        await manager.save(entries);
      }

      return cycle;
    });
  }

  async updateResult(
    cycleId: string,
    assetId: string,
    resultData: Partial<AuditResultEntry>,
  ): Promise<void> {
    await this.resultRepo.update(
      { auditCycleId: cycleId, assetId },
      resultData,
    );
  }

  async closeCycle(
    cycleId: string,
    confirmedMissingAssetIds: string[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      await manager.update(AuditCycle, cycleId, {
        status: 'CLOSED',
        closedAt: new Date(),
      });

      // Update missing assets to 'LOST'
      if (confirmedMissingAssetIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update(Asset)
          .set({ status: 'LOST' })
          .where('id IN (:...ids)', { ids: confirmedMissingAssetIds })
          .execute();
      }
    });
  }
}
