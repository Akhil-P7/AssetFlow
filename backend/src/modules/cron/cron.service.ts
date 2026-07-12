import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron('*/15 * * * *')
  async flagOverdueAllocations() {
    this.logger.log('Running CheckOverdueAllocationsJob');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Find overdue allocations that haven't been flagged yet
      const overdueAllocations = await queryRunner.manager.query(`
        SELECT a.id, a.employee_id, a.asset_id 
        FROM allocation a
        WHERE a.status = 'ACTIVE' 
          AND a.expected_return_date < CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM activity_log al 
            WHERE al.entity_id = a.id 
              AND al.action = 'OVERDUE_FLAGGED'
              AND al.entity_type = 'allocation'
          )
      `);

      for (const alloc of overdueAllocations) {
        await queryRunner.startTransaction();
        try {
          // 1. Log activity
          await queryRunner.manager.query(
            `
            INSERT INTO activity_log (actor_id, action, entity_type, entity_id, metadata)
            VALUES (NULL, 'OVERDUE_FLAGGED', 'allocation', $1, '{}')
          `,
            [alloc.id],
          );

          // 2. Create notification for the holder
          if (alloc.employee_id) {
            await queryRunner.manager.query(
              `
              INSERT INTO notification (recipient_id, type, payload)
              VALUES ($1, 'OVERDUE_RETURN_ALERT', $2)
            `,
              [
                alloc.employee_id,
                JSON.stringify({
                  allocationId: alloc.id,
                  assetId: alloc.asset_id,
                }),
              ],
            );
          }

          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          this.logger.error(
            `Failed to flag overdue allocation ${alloc.id}`,
            err,
          );
        }
      }
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async transitionBookingStatuses() {
    this.logger.log('Running BookingStatusTransitionJob');
    try {
      // Transition UPCOMING → ONGOING for bookings that have started
      await this.dataSource.query(`
        UPDATE booking SET status = 'ONGOING', updated_at = NOW()
        WHERE status = 'UPCOMING' AND lower(time_range) <= NOW() AND upper(time_range) > NOW()
      `);

      // Transition UPCOMING/ONGOING → COMPLETED for bookings that have ended
      await this.dataSource.query(`
        UPDATE booking SET status = 'COMPLETED', updated_at = NOW()
        WHERE status IN ('UPCOMING', 'ONGOING') AND upper(time_range) <= NOW()
      `);
    } catch (err) {
      this.logger.error('Failed to transition booking statuses', err);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendBookingReminders() {
    this.logger.log('Running UpcomingBookingReminderJob');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Find upcoming bookings within 30 minutes that haven't been reminded
      const upcomingBookings = await queryRunner.manager.query(`
        SELECT b.id, b.booked_by, b.resource_id, b.time_range
        FROM booking b
        WHERE b.status = 'UPCOMING'
          AND lower(b.time_range) <= NOW() + INTERVAL '30 minutes'
          AND lower(b.time_range) > NOW()
          AND NOT EXISTS (
            SELECT 1 FROM activity_log al 
            WHERE al.entity_id = b.id 
              AND al.action = 'REMINDER_SENT'
              AND al.entity_type = 'booking'
          )
      `);

      for (const booking of upcomingBookings) {
        await queryRunner.startTransaction();
        try {
          // 1. Log activity
          await queryRunner.manager.query(
            `
            INSERT INTO activity_log (actor_id, action, entity_type, entity_id, metadata)
            VALUES (NULL, 'REMINDER_SENT', 'booking', $1, '{}')
          `,
            [booking.id],
          );

          // 2. Create notification
          await queryRunner.manager.query(
            `
            INSERT INTO notification (recipient_id, type, payload)
            VALUES ($1, 'BOOKING_REMINDER', $2)
          `,
            [
              booking.booked_by,
              JSON.stringify({
                bookingId: booking.id,
                assetId: booking.resource_id,
              }),
            ],
          );

          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          this.logger.error(
            `Failed to send reminder for booking ${booking.id}`,
            err,
          );
        }
      }
    } finally {
      await queryRunner.release();
    }
  }
}
