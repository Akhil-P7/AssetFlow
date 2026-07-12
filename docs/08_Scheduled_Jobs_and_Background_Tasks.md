# AssetFlow — Technical Spec 08: Scheduled Jobs & Background Tasks

**Purpose:** Detailed specification for all background workers that run outside the request/response cycle. Covers trigger intervals, idempotency guarantees, error handling, and monitoring.

---

## 1. Overview of Scheduled Jobs

| Job | Interval | Purpose | Source Spec |
|---|---|---|---|
| Overdue Allocation Detection | Every 15 min | Flag allocations past expected return date, send alerts | Spec 03 §6, Job 1 |
| Booking Status Transition | Every 5 min | Auto-move UPCOMING→ONGOING→COMPLETED based on time | Spec 03 §6, Job 2 |
| Booking Reminder | Every 5 min | Send reminders 30 min before slot start | Spec 03 §6, Job 3 |
| Refresh Token Cleanup | Daily at 3:00 AM | Purge expired/revoked refresh tokens | Spec 04 §2 |

---

## 2. Job 1: Overdue Allocation Detection

### Trigger
- **Schedule:** `*/15 * * * *` (every 15 minutes)
- **Config:** `CRON_OVERDUE_CHECK` env variable

### Algorithm
```
1. Query all allocations WHERE:
   - status = 'ACTIVE'
   - expected_return_date < CURRENT_DATE (i.e., past due)
   - No existing OVERDUE_FLAGGED activity_log entry for this allocation
2. For each overdue allocation:
   a. Create notification (type: OVERDUE_RETURN_ALERT) for the allocated employee
   b. Create notification for the employee's department head (if exists)
   c. Write activity_log entry (action: 'OVERDUE_FLAGGED', actor: null/SYSTEM)
3. Log: "[OverdueJob] Flagged {count} overdue allocations"
```

### Idempotency Guard
The `NOT IN (SELECT entity_id FROM activity_log WHERE action='OVERDUE_FLAGGED')` clause ensures an allocation is only flagged **once**, even if the job runs multiple times. This is critical because:
- Cron jobs can double-fire during deployments/restarts
- We never want to spam users with duplicate "overdue" notifications

### SQL
```sql
SELECT a.id, a.asset_id, a.employee_id, a.expected_return_date,
       e.name as employee_name, e.department_id,
       ast.asset_tag, ast.name as asset_name
FROM allocation a
JOIN employee e ON e.id = a.employee_id
JOIN asset ast ON ast.id = a.asset_id
WHERE a.status = 'ACTIVE'
  AND a.expected_return_date < CURRENT_DATE
  AND a.id NOT IN (
    SELECT entity_id FROM activity_log
    WHERE action = 'OVERDUE_FLAGGED' AND entity_type = 'allocation'
  );
```

### Error Handling
- If notification creation fails for one allocation, log the error and continue with the next — don't abort the entire batch.
- If the database is unreachable, the job silently fails and retries on the next interval.

---

## 3. Job 2: Booking Status Auto-Transition

### Trigger
- **Schedule:** `*/5 * * * *` (every 5 minutes)
- **Config:** `CRON_BOOKING_TRANSITION` env variable

### Algorithm
```
1. Transition UPCOMING → ONGOING:
   UPDATE booking SET status='ONGOING', updated_at=now()
   WHERE status = 'UPCOMING'
     AND lower(time_range) <= now()
     AND upper(time_range) > now();

2. Transition UPCOMING/ONGOING → COMPLETED:
   UPDATE booking SET status='COMPLETED', updated_at=now()
   WHERE status IN ('UPCOMING', 'ONGOING')
     AND upper(time_range) <= now();

3. Log: "[BookingTransitionJob] {ongoingCount} → ONGOING, {completedCount} → COMPLETED"
```

### Design Decisions
- **No asset status change on booking completion:** Under the "RESERVED is informational" design decision (Spec 03 §1), bookable resources remain conceptually `AVAILABLE` between bookings. The `RESERVED` status on the asset is only used if the asset is single-purpose.
- **Bulk UPDATE, not per-row:** These are simple time-based transitions with no business-rule side effects, so a single UPDATE statement is safe and efficient.
- **No idempotency guard needed:** The WHERE clause itself is idempotent — running the same UPDATE twice has no effect because the status has already changed.

---

## 4. Job 3: Booking Reminders

### Trigger
- **Schedule:** `*/5 * * * *` (every 5 minutes)
- **Config:** `CRON_BOOKING_REMINDER` env variable
- **Look-ahead:** 30 minutes (configurable via `BOOKING_REMINDER_LOOKAHEAD_MINUTES`)

### Algorithm
```
1. Find upcoming bookings starting within the next 30 minutes:
   SELECT * FROM booking
   WHERE status = 'UPCOMING'
     AND lower(time_range) BETWEEN now() AND now() + interval '30 minutes'
     AND id NOT IN (
       SELECT entity_id FROM activity_log
       WHERE action = 'REMINDER_SENT' AND entity_type = 'booking'
     );

2. For each upcoming booking:
   a. Create notification (type: BOOKING_REMINDER) for the booked_by employee
   b. Write activity_log entry (action: 'REMINDER_SENT', actor: null/SYSTEM)

3. Log: "[BookingReminderJob] Sent {count} reminders"
```

### Idempotency Guard
Same pattern as Job 1 — the `activity_log` lookup prevents duplicate reminders even if the job fires twice within the look-ahead window.

### Timing Edge Case
With a 5-minute job interval and 30-minute look-ahead, a booking starting at 10:00 could receive its reminder anytime between 9:25 and 9:30 (depending on exactly when the cron fires). This is acceptable; exact-minute precision is not required for reminders.

---

## 5. Job 4: Refresh Token Cleanup

### Trigger
- **Schedule:** `0 3 * * *` (daily at 3:00 AM)

### Algorithm
```sql
DELETE FROM refresh_token
WHERE expires_at < now() - interval '7 days'
   OR revoked_at IS NOT NULL;
```

### Purpose
Prevents the `refresh_token` table from growing unboundedly. Expired and revoked tokens have no further use and can be safely deleted. The 7-day buffer past expiry ensures any active investigation into token theft (Spec 04 §9) has time to reference the records.

---

## 6. Implementation Pattern (NestJS)

All jobs are implemented in `/backend/src/shared/jobs/` using `@nestjs/schedule`:

```typescript
// jobs.module.ts
@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule, ActivityLogModule],
  providers: [OverdueJob, BookingTransitionJob, BookingReminderJob, TokenCleanupJob],
})
export class JobsModule {}

// overdue.job.ts
@Injectable()
export class OverdueJob {
  private readonly logger = new Logger(OverdueJob.name);

  constructor(
    private allocationRepo: AllocationRepository,
    private notificationService: NotificationService,
    private activityLogService: ActivityLogService,
  ) {}

  @Cron(process.env.CRON_OVERDUE_CHECK || '*/15 * * * *')
  async handleOverdueCheck() {
    this.logger.log('Running overdue allocation check...');
    try {
      const overdueAllocations = await this.allocationRepo.findOverdueUnflagged();
      for (const allocation of overdueAllocations) {
        try {
          await this.notificationService.create(
            allocation.employeeId,
            'OVERDUE_RETURN_ALERT',
            { allocationId: allocation.id, assetTag: allocation.assetTag }
          );
          await this.activityLogService.log(
            null, 'OVERDUE_FLAGGED', 'allocation', allocation.id, {}
          );
        } catch (err) {
          this.logger.error(`Failed to flag allocation ${allocation.id}`, err.stack);
          // Continue with next — don't abort batch
        }
      }
      this.logger.log(`Flagged ${overdueAllocations.length} overdue allocations`);
    } catch (err) {
      this.logger.error('Overdue check failed', err.stack);
    }
  }
}
```

### Error Isolation
Each job is wrapped in its own try/catch so one failing job doesn't prevent others from running. Per-item errors within a batch are caught individually so one failed notification doesn't skip remaining items.

---

## 7. Monitoring & Observability

- Each job logs start/completion/error with item counts
- Job execution times are logged for performance tracking
- Failures are logged with full stack traces
- In production, consider:
  - Health check endpoint that reports last successful run time for each job
  - Alerting if a job hasn't run in 2× its scheduled interval
