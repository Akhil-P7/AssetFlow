import { Injectable, Logger } from '@nestjs/common';
import { AllocationsRepository } from './allocations.repository';
import { DataSource } from 'typeorm';
import { Allocation } from './allocation.entity';
import { TransferRequest } from './transfer-request.entity';
import { AssetsService } from '../assets/assets.service';
import {
  CreateAllocationDto,
  ReturnAssetDto,
  CreateTransferDto,
  RejectTransferDto,
} from './allocations.dto';
import { ApiError } from '../../common/exceptions/api-error.exception';

/**
 * Allocation + Transfer service — implements the conflict handling algorithm
 * from Spec 03 §2 and the transfer transaction from Spec 01 §5.2.
 */
@Injectable()
export class AllocationsService {
  private readonly logger = new Logger(AllocationsService.name);
  constructor(
    private readonly repository: AllocationsRepository,
    private readonly dataSource: DataSource,
    private readonly assetsService: AssetsService,
  ) {}

  async findAll(query: any, actor: any) {
    return this.dataSource.getRepository(Allocation).find();
  }

  /** Allocate asset — returns 409 ALLOCATION_CONFLICT if already allocated (Spec 03 §2) */
  async allocate(dto: CreateAllocationDto, actor: any) {
    this.logger.log(`Allocating asset ${dto.assetId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock the asset to prevent concurrent allocations
      const activeAllocation = await queryRunner.manager
        .getRepository(Allocation)
        .createQueryBuilder('alloc')
        .where('alloc.asset_id = :assetId', { assetId: dto.assetId })
        .andWhere('alloc.status = :status', { status: 'ACTIVE' })
        .setLock('pessimistic_write')
        .getOne();

      if (activeAllocation) {
        throw new ApiError(
          'ALLOCATION_CONFLICT',
          409,
          'Asset is already allocated',
        );
      }

      // 2. Transition asset status to ALLOCATED via AssetsService
      await this.assetsService.transitionStatus(
        dto.assetId,
        'ALLOCATED',
        'allocation.create',
        actor.role,
        undefined,
        queryRunner,
      );

      // 3. Create allocation record
      const allocation = queryRunner.manager.getRepository(Allocation).create({
        assetId: dto.assetId,
        employeeId: dto.employeeId,
        departmentId: dto.departmentId,
        expectedReturnDate: dto.expectedReturnDate,
        createdBy: actor.id,
        status: 'ACTIVE',
      });
      await queryRunner.manager.save(allocation);

      await queryRunner.commitTransaction();
      return allocation;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** Return asset — close allocation, revert asset to AVAILABLE */
  async returnAsset(id: string, dto: ReturnAssetDto, actor: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const allocation = await queryRunner.manager
        .getRepository(Allocation)
        .findOne({ where: { id, status: 'ACTIVE' } });
      if (!allocation)
        throw new ApiError('NOT_FOUND', 404, 'Active allocation not found');

      let resolvedActorRole = actor.role;
      // Allow Holder to return
      if (allocation.employeeId === actor.id) {
        resolvedActorRole = 'HOLDER';
      }

      // 1. Transition asset status back to AVAILABLE
      await this.assetsService.transitionStatus(
        allocation.assetId,
        'AVAILABLE',
        'allocation.return',
        resolvedActorRole,
        dto.conditionNote,
        queryRunner,
      );

      // 2. Close allocation
      allocation.status = 'CLOSED';
      allocation.returnedAt = new Date();
      allocation.returnConditionNote = dto.conditionNote;
      await queryRunner.manager.save(allocation);

      await queryRunner.commitTransaction();
      return allocation;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findTransfers(query: any, actor: any) {
    return this.dataSource.getRepository(TransferRequest).find();
  }

  async requestTransfer(dto: CreateTransferDto, actor: any) {
    const allocation = await this.dataSource
      .getRepository(Allocation)
      .findOne({ where: { id: dto.allocationId, status: 'ACTIVE' } });
    if (!allocation)
      throw new ApiError('NOT_FOUND', 404, 'Active allocation not found');

    const transfer = this.dataSource.getRepository(TransferRequest).create({
      allocationId: dto.allocationId,
      assetId: allocation.assetId,
      toEmployeeId: dto.toEmployeeId,
      toDepartmentId: dto.toDepartmentId,
      requestedBy: actor.id,
      status: 'REQUESTED',
    });
    return this.dataSource.getRepository(TransferRequest).save(transfer);
  }

  /** Approve transfer — single transaction: close old allocation, create new one (Spec 01 §5.2) */
  async approveTransfer(id: string, actor: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transfer = await queryRunner.manager
        .getRepository(TransferRequest)
        .findOne({ where: { id, status: 'REQUESTED' } });
      if (!transfer)
        throw new ApiError(
          'NOT_FOUND',
          404,
          'Pending transfer request not found',
        );

      const oldAllocation = await queryRunner.manager
        .getRepository(Allocation)
        .createQueryBuilder('alloc')
        .where('alloc.id = :id', { id: transfer.allocationId })
        .setLock('pessimistic_write')
        .getOne();

      if (!oldAllocation || oldAllocation.status !== 'ACTIVE') {
        throw new ApiError(
          'CONFLICT',
          409,
          'Original allocation is no longer active',
        );
      }

      // Close old allocation
      oldAllocation.status = 'CLOSED';
      oldAllocation.returnedAt = new Date();
      oldAllocation.returnConditionNote = 'Transferred';
      await queryRunner.manager.save(oldAllocation);

      // Create new allocation
      const newAllocation = queryRunner.manager
        .getRepository(Allocation)
        .create({
          assetId: transfer.assetId,
          employeeId: transfer.toEmployeeId,
          departmentId: transfer.toDepartmentId,
          createdBy: actor.id, // The approver or the requester? Let's say approver.
          status: 'ACTIVE',
        });
      await queryRunner.manager.save(newAllocation);

      // Update transfer status
      transfer.status = 'APPROVED';
      transfer.approvedBy = actor.id;
      transfer.approvedAt = new Date();
      await queryRunner.manager.save(transfer);

      await queryRunner.commitTransaction();
      return { transfer, newAllocation };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectTransfer(id: string, dto: RejectTransferDto, actor: any) {
    const transfer = await this.dataSource
      .getRepository(TransferRequest)
      .findOne({ where: { id, status: 'REQUESTED' } });
    if (!transfer)
      throw new ApiError(
        'NOT_FOUND',
        404,
        'Pending transfer request not found',
      );

    transfer.status = 'REJECTED';
    // optionally save the reason in a note field if it existed
    return this.dataSource.getRepository(TransferRequest).save(transfer);
  }
}
