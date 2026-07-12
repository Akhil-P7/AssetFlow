import { Injectable, Logger } from '@nestjs/common';
import { MaintenanceRepository } from './maintenance.repository';
import { assertValidTransition } from '../../shared/state-machine/asset-transitions';
import { ApiError } from '../../common/exceptions/api-error.exception';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  constructor(private readonly repository: MaintenanceRepository) {}

  async findAll(query: any) {
    return this.repository.findAll(query);
  }

  async create(dto: any, actor: any) {
    // Basic creation logic
    const req = await this.repository.create({
      ...dto,
      raisedBy: actor.id,
      status: 'PENDING',
    });
    return req;
  }

  async approve(id: string, actor: any) {
    const req = await this.repository.findById(id);
    if (!req)
      throw new ApiError('NOT_FOUND', 404, 'Maintenance request not found');
    if (req.status !== 'PENDING')
      throw new ApiError(
        'BAD_REQUEST',
        400,
        'Can only approve pending requests',
      );

    // Sync Asset status to UNDER_MAINTENANCE using the state machine
    if (req.asset) {
      assertValidTransition(
        req.asset.status as any,
        'UNDER_MAINTENANCE',
        'maintenance.approve',
        actor.role,
      );
      await this.repository.updateStatusWithAssetSync(
        id,
        'APPROVED',
        req.assetId,
        'UNDER_MAINTENANCE',
      );
    } else {
      await this.repository.update(id, {
        status: 'APPROVED',
        approvedBy: actor.id,
      });
    }

    return { success: true };
  }

  async reject(id: string, dto: any, actor: any) {
    const req = await this.repository.findById(id);
    if (!req || req.status !== 'PENDING')
      throw new ApiError('BAD_REQUEST', 400, 'Invalid request');

    await this.repository.update(id, { status: 'REJECTED' });
    return { success: true };
  }

  async assignTechnician(id: string, dto: any) {
    const req = await this.repository.findById(id);
    if (!req || req.status !== 'APPROVED')
      throw new ApiError('BAD_REQUEST', 400, 'Must be approved first');

    await this.repository.update(id, {
      status: 'TECHNICIAN_ASSIGNED',
      technicianName: dto.technicianName,
    });
    return { success: true };
  }

  async start(id: string) {
    const req = await this.repository.findById(id);
    if (!req || req.status !== 'TECHNICIAN_ASSIGNED')
      throw new ApiError('BAD_REQUEST', 400, 'Requires technician');

    await this.repository.update(id, { status: 'IN_PROGRESS' });
    return { success: true };
  }

  async resolve(id: string, actor: any) {
    const req = await this.repository.findById(id);
    if (!req || req.status !== 'IN_PROGRESS')
      throw new ApiError('BAD_REQUEST', 400, 'Not in progress');

    if (req.asset) {
      assertValidTransition(
        req.asset.status as any,
        'AVAILABLE',
        'maintenance.resolve',
        actor.role,
      );
      await this.repository.updateStatusWithAssetSync(
        id,
        'RESOLVED',
        req.assetId,
        'AVAILABLE',
      );
    } else {
      await this.repository.update(id, {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });
    }

    return { success: true };
  }
}
