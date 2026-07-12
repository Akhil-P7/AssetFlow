import { Injectable } from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { MaintenanceRequest } from './maintenance-request.entity';
import { Asset } from '../assets/asset.entity';
import { ApiError } from '../../common/exceptions/api-error.exception';

@Injectable()
export class MaintenanceRepository {
  private repo: Repository<MaintenanceRequest>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(MaintenanceRequest);
  }

  async findAll(query: any): Promise<MaintenanceRequest[]> {
    return this.repo.find({
      relations: { asset: true, raiser: true, approver: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<MaintenanceRequest | null> {
    return this.repo.findOne({ where: { id }, relations: { asset: true } });
  }

  async create(data: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<MaintenanceRequest>): Promise<void> {
    await this.repo.update(id, data);
  }

  // Atomic transaction to update both MaintenanceRequest and Asset statuses
  async updateStatusWithAssetSync(
    maintenanceId: string,
    newMaintenanceStatus: string,
    assetId: string,
    newAssetStatus: string,
    technicianName?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const updateData: Partial<MaintenanceRequest> = {
        status: newMaintenanceStatus,
      };
      if (technicianName) updateData.technicianName = technicianName;
      if (newMaintenanceStatus === 'RESOLVED')
        updateData.resolvedAt = new Date();

      await manager.update(MaintenanceRequest, maintenanceId, updateData);
      await manager.update(Asset, assetId, { status: newAssetStatus });
    });
  }
}
