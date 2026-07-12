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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async escalateMaintenanceJob() {
    this.logger.log('Running EscalateMaintenanceJob');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Find requests pending/in_progress for > 7 days
      const stagnantRequests = await queryRunner.manager.query(`
        SELECT m.id, m.raised_by, m.priority, m.status, m.asset_id
        FROM maintenance_request m
        WHERE m.status IN ('PENDING', 'IN_PROGRESS')
          AND m.created_at < NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM activity_log al 
            WHERE al.entity_id = m.id 
              AND al.action = 'MAINTENANCE_ESCALATED'
          )
      `);

      for (const req of stagnantRequests) {
        await queryRunner.startTransaction();
        try {
          const newPriority = req.priority === 'LOW' ? 'MEDIUM' : (req.priority === 'MEDIUM' ? 'HIGH' : 'CRITICAL');
          
          await queryRunner.manager.query(`
            UPDATE maintenance_request 
            SET priority = $1, updated_at = NOW() 
            WHERE id = $2
          `, [newPriority, req.id]);

          await queryRunner.manager.query(`
            INSERT INTO activity_log (entity_type, entity_id, action, actor_id, metadata)
            VALUES ('MAINTENANCE', $1, 'MAINTENANCE_ESCALATED', NULL, $2)
          `, [req.id, JSON.stringify({ oldPriority: req.priority, newPriority })]);

          await queryRunner.manager.query(`
            INSERT INTO notification (recipient_id, type, payload, created_at)
            VALUES ($1, 'MAINTENANCE_ESCALATED', $2, NOW())
          `, [req.raised_by, JSON.stringify({ maintenanceId: req.id, assetId: req.asset_id, priority: newPriority })]);

          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`Failed to escalate maintenance ${req.id}`, err);
        }
      }
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async closeAuditCyclesJob() {
    this.logger.log('Running CloseAuditCyclesJob');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Close open cycles where end_date is past
      const expiredCycles = await queryRunner.manager.query(`
        SELECT a.id, a.created_by
        FROM audit_cycle a
        WHERE a.status = 'OPEN'
          AND a.end_date < CURRENT_DATE
      `);

      for (const cycle of expiredCycles) {
        await queryRunner.startTransaction();
        try {
          await queryRunner.manager.query(`
            UPDATE audit_cycle 
            SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW() 
            WHERE id = $1
          `, [cycle.id]);

          await queryRunner.manager.query(`
            INSERT INTO activity_log (entity_type, entity_id, action, actor_id, metadata)
            VALUES ('AUDIT_CYCLE', $1, 'AUDIT_CLOSED', NULL, '{}')
          `, [cycle.id]);

          await queryRunner.manager.query(`
            INSERT INTO notification (recipient_id, type, payload, created_at)
            VALUES ($1, 'AUDIT_CYCLE_CLOSED', $2, NOW())
          `, [cycle.created_by, JSON.stringify({ auditCycleId: cycle.id })]);

          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`Failed to close audit cycle ${cycle.id}`, err);
        }
      }
    } finally {
      await queryRunner.release();
    }
  }
}
