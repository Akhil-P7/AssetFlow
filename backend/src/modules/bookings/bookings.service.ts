import { Injectable, Logger } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { DataSource, QueryFailedError } from 'typeorm';
import { Booking } from './booking.entity';
import {
  CreateBookingDto,
  CancelBookingDto,
  RescheduleBookingDto,
} from './bookings.dto';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { AssetsService } from '../assets/assets.service';

/**
 * Booking service — implements overlap handling from Spec 03 §3.
 * Catches Postgres exclusion_violation (23P01) and translates to BOOKING_OVERLAP.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  constructor(
    private readonly repository: BookingsRepository,
    private readonly dataSource: DataSource,
    private readonly assetsService: AssetsService,
  ) {}

  async findAll(query: any, actor: any) {
    return this.dataSource.getRepository(Booking).find();
  }

  async getCalendar(assetId: string, query: any) {
    return this.dataSource
      .getRepository(Booking)
      .find({ where: { resourceId: assetId } });
  }

  async create(dto: CreateBookingDto, actor: any) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (endTime <= startTime) {
      throw new ApiError(
        'BAD_REQUEST',
        400,
        'End time must be after start time',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Transition asset to RESERVED (unless already RESERVED, but wait,
      // multiple bookings can exist in the future, so asset status is only RESERVED
      // if it's currently happening. Actually, Spec says we don't strictly keep asset in RESERVED
      // indefinitely if it's future. For now, let's just insert the booking.
      // The exclusion constraint handles overlapping.

      const timeRange = `[${dto.startTime}, ${dto.endTime})`;

      // Insert directly to leverage Postgres exclusion constraint
      const insertResult = await queryRunner.manager.query(
        `INSERT INTO booking (resource_id, booked_by, booked_for_department_id, time_range, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'UPCOMING', NOW(), NOW())
         RETURNING *`,
        [
          dto.resourceId,
          actor.id,
          dto.bookedForDepartmentId || null,
          timeRange,
        ],
      );
      const booking = insertResult[0];

      await queryRunner.commitTransaction();
      return booking;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      // Postgres exclusion_violation
      if (err.code === '23P01') {
        throw new ApiError(
          'BOOKING_OVERLAP',
          409,
          'The requested time slot overlaps with an existing booking',
        );
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(id: string, dto: CancelBookingDto, actor: any) {
    const booking = await this.dataSource
      .getRepository(Booking)
      .findOne({ where: { id } });
    if (!booking) throw new ApiError('NOT_FOUND', 404, 'Booking not found');

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new ApiError(
        'BAD_REQUEST',
        400,
        `Cannot cancel booking with status ${booking.status}`,
      );
    }

    let resolvedActorRole = actor.role;
    if (booking.bookedBy === actor.id) resolvedActorRole = 'BOOKING_OWNER';

    // Verify role (admin, asset_manager, or booking owner)
    if (
      !['ADMIN', 'ASSET_MANAGER', 'BOOKING_OWNER'].includes(resolvedActorRole)
    ) {
      throw new ApiError(
        'FORBIDDEN',
        403,
        'Not authorized to cancel this booking',
      );
    }

    booking.status = 'CANCELLED';
    booking.cancelledReason = dto.reason;
    await this.dataSource.getRepository(Booking).save(booking);

    // If the booking is currently ongoing, transition asset back to AVAILABLE
    // (In a full implementation, we'd check if the time range includes NOW)

    return booking;
  }

  async reschedule(id: string, dto: RescheduleBookingDto, actor: any) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (endTime <= startTime) {
      throw new ApiError(
        'BAD_REQUEST',
        400,
        'End time must be after start time',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager
        .getRepository(Booking)
        .findOne({ where: { id } });
      if (!booking) throw new ApiError('NOT_FOUND', 404, 'Booking not found');

      if (booking.status !== 'UPCOMING') {
        throw new ApiError(
          'BAD_REQUEST',
          400,
          'Only UPCOMING bookings can be rescheduled',
        );
      }

      let resolvedActorRole = actor.role;
      if (booking.bookedBy === actor.id) resolvedActorRole = 'BOOKING_OWNER';
      if (
        !['ADMIN', 'ASSET_MANAGER', 'BOOKING_OWNER'].includes(resolvedActorRole)
      ) {
        throw new ApiError(
          'FORBIDDEN',
          403,
          'Not authorized to reschedule this booking',
        );
      }

      const timeRange = `[${dto.startTime}, ${dto.endTime})`;

      // Update directly to trigger exclusion constraint checks
      await queryRunner.manager.query(
        `UPDATE booking SET time_range = $1, updated_at = NOW() WHERE id = $2`,
        [timeRange, id],
      );

      await queryRunner.commitTransaction();

      const updated = await this.dataSource
        .getRepository(Booking)
        .findOne({ where: { id } });
      return updated;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      if (err.code === '23P01') {
        throw new ApiError(
          'BOOKING_OVERLAP',
          409,
          'The requested time slot overlaps with an existing booking',
        );
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
