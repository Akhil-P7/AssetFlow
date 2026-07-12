# AssetFlow — Technical Spec 03: Business Logic, State Machines & Concurrency

**Purpose:** This document specifies *how* the business rules are actually implemented in the service layer — the part that turns "assets can transition between states" from a sentence in a problem statement into enforceable code. Pseudocode is language-agnostic (reads like TypeScript) but the patterns apply equally to any backend stack.

---

## 1. Asset Lifecycle State Transition Table

Rather than scattering `if (asset.status === 'AVAILABLE')` checks across every controller, implement **one central table** that every status change must pass through:

```typescript
type AssetStatus = 'AVAILABLE' | 'ALLOCATED' | 'RESERVED' | 'UNDER_MAINTENANCE'
                  | 'LOST' | 'RETIRED' | 'DISPOSED';

interface Transition {
  from: AssetStatus;
  to: AssetStatus;
  triggeredBy: string;        // which workflow/event causes this
  allowedRoles: Role[];
}

const ASSET_TRANSITIONS: Transition[] = [
  { from: 'AVAILABLE',          to: 'ALLOCATED',         triggeredBy: 'allocation.create',        allowedRoles: ['ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD'] },
  { from: 'AVAILABLE',          to: 'RESERVED',           triggeredBy: 'booking.create',            allowedRoles: ['ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD','EMPLOYEE'] },
  { from: 'AVAILABLE',          to: 'UNDER_MAINTENANCE',  triggeredBy: 'maintenance.approve',       allowedRoles: ['ASSET_MANAGER'] },
  { from: 'ALLOCATED',          to: 'AVAILABLE',          triggeredBy: 'allocation.return',          allowedRoles: ['ADMIN','ASSET_MANAGER','HOLDER'] },
  { from: 'ALLOCATED',          to: 'UNDER_MAINTENANCE',  triggeredBy: 'maintenance.approve',        allowedRoles: ['ASSET_MANAGER'] },
  { from: 'RESERVED',           to: 'AVAILABLE',          triggeredBy: 'booking.complete',           allowedRoles: ['SYSTEM'] },
  { from: 'RESERVED',           to: 'AVAILABLE',          triggeredBy: 'booking.cancel',             allowedRoles: ['ADMIN','ASSET_MANAGER','BOOKING_OWNER'] },
  { from: 'UNDER_MAINTENANCE',  to: 'AVAILABLE',          triggeredBy: 'maintenance.resolve',        allowedRoles: ['ASSET_MANAGER'] },
  { from: 'UNDER_MAINTENANCE',  to: 'LOST',                triggeredBy: 'audit.close.confirmedMissing', allowedRoles: ['SYSTEM'] },
  { from: 'AVAILABLE',          to: 'LOST',                triggeredBy: 'audit.close.confirmedMissing', allowedRoles: ['SYSTEM'] },
  { from: 'ALLOCATED',          to: 'LOST',                triggeredBy: 'audit.close.confirmedMissing', allowedRoles: ['SYSTEM'] },
  { from: 'LOST',               to: 'AVAILABLE',           triggeredBy: 'manual.override.recovered',  allowedRoles: ['ADMIN','ASSET_MANAGER'] },
  { from: 'AVAILABLE',          to: 'RETIRED',              triggeredBy: 'manual.override.retire',     allowedRoles: ['ADMIN','ASSET_MANAGER'] },
  { from: 'LOST',               to: 'RETIRED',              triggeredBy: 'manual.override.retire',     allowedRoles: ['ADMIN','ASSET_MANAGER'] },
  { from: 'RETIRED',            to: 'DISPOSED',             triggeredBy: 'manual.override.dispose',    allowedRoles: ['ADMIN'] },
];

function assertValidTransition(currentStatus: AssetStatus, targetStatus: AssetStatus, event: string, actorRole: Role) {
  const match = ASSET_TRANSITIONS.find(t =>
    t.from === currentStatus && t.to === targetStatus && t.triggeredBy === event
  );
  if (!match) {
    throw new ApiError('INVALID_STATE_TRANSITION', 409,
      `Cannot move asset from ${currentStatus} to ${targetStatus} via ${event}`);
  }
  if (!match.allowedRoles.includes(actorRole) && !match.allowedRoles.includes('HOLDER_OR_OWNER_RESOLVED_AT_RUNTIME')) {
    throw new ApiError('FORBIDDEN', 403, `Role ${actorRole} cannot perform ${event}`);
  }
}
```

**Every service method that changes `asset.status` calls `assertValidTransition()` first, inside the same DB transaction as the actual update.** This is what makes an illegal jump (e.g. `ALLOCATED → DISPOSED` directly) structurally impossible regardless of which screen or API client attempts it — there is no code path that updates `asset.status` without going through this table.

`RESERVED` note: an asset only enters `RESERVED` as its primary status if it is *exclusively* a shared bookable resource with no allocation concept in play; in practice most bookable resources (rooms, vehicles) stay conceptually `AVAILABLE` between bookings and `RESERVED` is really a per-booking-window state reflected in the `booking` table rather than a persistent asset-level status. Implementation choice: treat `RESERVED` as informational (asset is bookable and has an upcoming booking) rather than blocking `AVAILABLE`-for-allocation-purposes, unless the org's use case requires resources to be single-purpose. Document this decision in code comments so the intent doesn't get lost.

---

## 2. Allocation Conflict Handling — full algorithm

```typescript
async function allocateAsset(assetId: string, target: {employeeId?: string, departmentId?: string},
                              expectedReturnDate: Date | null, actor: User): Promise<Allocation> {
  return db.transaction(async (tx) => {
    // Row-lock any existing active allocation for this asset to close the race window
    const existing = await tx.query(
      `SELECT a.*, e.name as holder_name FROM allocation a
       LEFT JOIN employee e ON e.id = a.employee_id
       WHERE a.asset_id = $1 AND a.status = 'ACTIVE' FOR UPDATE`,
      [assetId]
    );

    if (existing.rows.length > 0) {
      throw new ApiError('ALLOCATION_CONFLICT', 409, `Asset already held`, {
        currentHolder: existing.rows[0]
      });
    }

    const asset = await tx.query(`SELECT status FROM asset WHERE id = $1 FOR UPDATE`, [assetId]);
    assertValidTransition(asset.rows[0].status, 'ALLOCATED', 'allocation.create', actor.role);

    const allocation = await tx.query(
      `INSERT INTO allocation (asset_id, employee_id, department_id, expected_return_date, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [assetId, target.employeeId, target.departmentId, expectedReturnDate, actor.id]
    );

    await tx.query(`UPDATE asset SET status = 'ALLOCATED', updated_at = now() WHERE id = $1`, [assetId]);

    await logActivity(tx, actor.id, 'ALLOCATION_CREATED', 'allocation', allocation.rows[0].id, {
      assetId, target
    });

    await createNotification(tx, target.employeeId, 'ASSET_ASSIGNED', { assetId });

    return allocation.rows[0];
  });
  // Even without the SELECT...FOR UPDATE check, the partial unique index (Spec 01 §5.1)
  // is the real backstop: if two requests somehow both pass the SELECT check due to
  // isolation-level nuances, the second INSERT will fail on the unique constraint and
  // the transaction rolls back cleanly. The application check exists purely for a
  // fast, friendly error message — the database constraint is the source of truth.
}
```

Key principle demonstrated here: **defense in depth**. The `FOR UPDATE` lock + pre-check gives a good user-facing error message in the common case; the DB constraint guarantees correctness even in the uncommon case (e.g., serializable isolation edge cases, application bugs, direct DB access). Never rely on only one layer.

---

## 3. Booking Overlap Handling — full algorithm

```typescript
async function createBooking(resourceId: string, startTime: Date, endTime: Date, actor: User): Promise<Booking> {
  if (endTime <= startTime) {
    throw new ApiError('VALIDATION_ERROR', 400, 'endTime must be after startTime');
  }

  const resource = await db.query(`SELECT is_bookable FROM asset WHERE id = $1`, [resourceId]);
  if (!resource.rows[0]?.is_bookable) {
    throw new ApiError('VALIDATION_ERROR', 400, 'This asset is not a bookable resource');
  }

  try {
    return await db.transaction(async (tx) => {
      const booking = await tx.query(
        `INSERT INTO booking (resource_id, booked_by, time_range)
         VALUES ($1, $2, tstzrange($3, $4, '[)')) RETURNING *`,
        [resourceId, actor.id, startTime, endTime]
      );
      await logActivity(tx, actor.id, 'BOOKING_CREATED', 'booking', booking.rows[0].id, { resourceId, startTime, endTime });
      await createNotification(tx, actor.id, 'BOOKING_CONFIRMED', { bookingId: booking.rows[0].id });
      return booking.rows[0];
    });
  } catch (err) {
    if (err.code === '23P01') { // Postgres exclusion_violation
      const conflicting = await db.query(
        `SELECT * FROM booking WHERE resource_id = $1 AND status IN ('UPCOMING','ONGOING')
         AND time_range && tstzrange($2, $3, '[)')`,
        [resourceId, startTime, endTime]
      );
      throw new ApiError('BOOKING_OVERLAP', 409, 'This slot overlaps an existing booking', {
        conflictingBooking: conflicting.rows[0]
      });
    }
    throw err;
  }
}
```

**Why the exclusion constraint (not just an app-level overlap query) matters:** an app-level "check then insert" has the exact same race condition as allocation — two simultaneous requests for the same slot can both pass the check before either inserts. The exclusion constraint makes the database itself the final arbiter; the `try/catch` around `23P01` is purely for translating the DB-level rejection into a friendly API response, mirroring the defense-in-depth pattern from §2.

**Boundary case validation (explicit unit test to write):**
```
Existing: [09:00, 10:00)
Request A: [09:30, 10:30) -> REJECTED (overlaps)
Request B: [10:00, 11:00) -> ACCEPTED (touches but does not overlap, half-open range semantics)
```

---

## 4. Maintenance Workflow — state-linked side effects

```typescript
async function approveMaintenanceRequest(requestId: string, actor: User): Promise<MaintenanceRequest> {
  return db.transaction(async (tx) => {
    const req = await tx.query(`SELECT * FROM maintenance_request WHERE id=$1 FOR UPDATE`, [requestId]);
    if (req.rows[0].status !== 'PENDING') {
      throw new ApiError('INVALID_STATE_TRANSITION', 409, 'Only PENDING requests can be approved');
    }

    const asset = await tx.query(`SELECT status FROM asset WHERE id=$1 FOR UPDATE`, [req.rows[0].asset_id]);
    assertValidTransition(asset.rows[0].status, 'UNDER_MAINTENANCE', 'maintenance.approve', actor.role);

    await tx.query(`UPDATE maintenance_request SET status='APPROVED', approved_by=$1, updated_at=now() WHERE id=$2`,
      [actor.id, requestId]);
    await tx.query(`UPDATE asset SET status='UNDER_MAINTENANCE', updated_at=now() WHERE id=$1`,
      [req.rows[0].asset_id]);

    await logActivity(tx, actor.id, 'MAINTENANCE_APPROVED', 'maintenance_request', requestId, {});
    await createNotification(tx, req.rows[0].raised_by, 'MAINTENANCE_APPROVED', { requestId });

    return req.rows[0];
  });
}

async function resolveMaintenanceRequest(requestId: string, actor: User): Promise<MaintenanceRequest> {
  return db.transaction(async (tx) => {
    const req = await tx.query(`SELECT * FROM maintenance_request WHERE id=$1 FOR UPDATE`, [requestId]);
    if (!['IN_PROGRESS', 'TECHNICIAN_ASSIGNED'].includes(req.rows[0].status)) {
      throw new ApiError('INVALID_STATE_TRANSITION', 409, 'Request must be in progress before resolving');
    }
    await tx.query(`UPDATE maintenance_request SET status='RESOLVED', resolved_at=now() WHERE id=$1`, [requestId]);
    await tx.query(`UPDATE asset SET status='AVAILABLE', updated_at=now() WHERE id=$1`, [req.rows[0].asset_id]);
    await logActivity(tx, actor.id, 'MAINTENANCE_RESOLVED', 'maintenance_request', requestId, {});
    return req.rows[0];
  });
}
```

**The non-negotiable rule this encodes:** asset.status can *only* become `UNDER_MAINTENANCE` as a same-transaction side effect of a maintenance request being approved — there is no direct "set asset to under maintenance" endpoint reachable outside this workflow (see Spec 02 §3 note on why generic asset PATCH excludes `status`).

---

## 5. Audit Cycle Closure — irreversibility guarantee

```typescript
async function closeAuditCycle(cycleId: string, actor: User): Promise<AuditCycle> {
  return db.transaction(async (tx) => {
    const cycle = await tx.query(`SELECT * FROM audit_cycle WHERE id=$1 FOR UPDATE`, [cycleId]);
    if (cycle.rows[0].status === 'CLOSED') {
      throw new ApiError('AUDIT_CYCLE_CLOSED', 409, 'This cycle is already closed');
    }

    // Any results still PENDING at close time are treated as unverified -> flagged, not silently dropped
    const unresolvedCount = await tx.query(
      `SELECT count(*) FROM audit_result WHERE audit_cycle_id=$1 AND result='PENDING'`, [cycleId]
    );

    await tx.query(`UPDATE audit_cycle SET status='CLOSED', closed_at=now() WHERE id=$1`, [cycleId]);

    const missingAssets = await tx.query(
      `SELECT asset_id FROM audit_result WHERE audit_cycle_id=$1 AND result='MISSING'`, [cycleId]
    );
    for (const row of missingAssets.rows) {
      const asset = await tx.query(`SELECT status FROM asset WHERE id=$1 FOR UPDATE`, [row.asset_id]);
      assertValidTransition(asset.rows[0].status, 'LOST', 'audit.close.confirmedMissing', 'SYSTEM');
      await tx.query(`UPDATE asset SET status='LOST', updated_at=now() WHERE id=$1`, [row.asset_id]);
      await createNotification(tx, actor.id, 'AUDIT_DISCREPANCY_FLAGGED', { assetId: row.asset_id });
    }

    await logActivity(tx, actor.id, 'AUDIT_CYCLE_CLOSED', 'audit_cycle', cycleId, {
      unresolvedCount: unresolvedCount.rows[0].count
    });

    return cycle.rows[0];
  });
}
```

Combined with the `trg_lock_closed_audit` trigger (Spec 01 §7), this guarantees a closed cycle's results can never be edited by any code path — even a future engineer adding a new endpoint would hit the trigger, not just a forgotten `if` check.

---

## 6. Scheduled Jobs (background workers)

These run outside the request/response cycle — implement as cron-triggered functions (e.g. every 15 min for overdue detection, every 5 min for booking transitions):

```typescript
// Job 1: Overdue allocation detection — every 15 min
async function flagOverdueAllocations() {
  const overdue = await db.query(
    `SELECT * FROM allocation WHERE status='ACTIVE' AND expected_return_date < CURRENT_DATE
     AND id NOT IN (SELECT entity_id FROM activity_log WHERE action='OVERDUE_FLAGGED' AND entity_type='allocation')`
  );
  for (const a of overdue.rows) {
    await createNotification(db, a.employee_id, 'OVERDUE_RETURN_ALERT', { allocationId: a.id });
    await logActivity(db, null, 'OVERDUE_FLAGGED', 'allocation', a.id, {});
  }
}

// Job 2: Booking status auto-transition — every 5 min
async function transitionBookingStatuses() {
  await db.query(`UPDATE booking SET status='ONGOING' WHERE status='UPCOMING' AND lower(time_range) <= now() AND upper(time_range) > now()`);
  await db.query(`UPDATE booking SET status='COMPLETED' WHERE status IN ('UPCOMING','ONGOING') AND upper(time_range) <= now()`);
  // Note: when a booking completes, no asset.status change is needed under the
  // "RESERVED is informational" design decision from §1.
}

// Job 3: Booking reminders — every 5 min, look-ahead window e.g. 30 min
async function sendBookingReminders() {
  const upcoming = await db.query(
    `SELECT * FROM booking WHERE status='UPCOMING' AND lower(time_range) BETWEEN now() AND now() + interval '30 minutes'
     AND id NOT IN (SELECT entity_id FROM activity_log WHERE action='REMINDER_SENT' AND entity_type='booking')`
  );
  for (const b of upcoming.rows) {
    await createNotification(db, b.booked_by, 'BOOKING_REMINDER', { bookingId: b.id });
    await logActivity(db, null, 'REMINDER_SENT', 'booking', b.id, {});
  }
}
```

The `NOT IN (SELECT ... activity_log ...)` idempotency guard prevents duplicate notifications if a job runs twice or overlaps — important since cron jobs can occasionally double-fire under deploy/restart conditions.

---

## 7. Role-Scoped Query Pattern

Every "list" endpoint that isn't Admin-only needs its own scoping clause, applied at the query layer (not filtered after fetching, which risks leaking data through pagination counts):

```typescript
function scopeAssetQuery(baseQuery: QueryBuilder, actor: User): QueryBuilder {
  switch (actor.role) {
    case 'ADMIN':
    case 'ASSET_MANAGER':
      return baseQuery; // no restriction
    case 'DEPARTMENT_HEAD':
      return baseQuery.where('department_id', actor.departmentId);
    case 'EMPLOYEE':
      return baseQuery.whereExists(sub =>
        sub.from('allocation').where('allocation.asset_id', '=', 'asset.id')
           .andWhere('allocation.employee_id', actor.id)
           .andWhere('allocation.status', 'ACTIVE')
      );
  }
}
```

This same pattern (a `scopeXQuery` function per entity) should back every list/report endpoint in Spec 02 — it is the actual mechanism behind "Employee: Views assets allocated to them" rather than a UI-only filter.

---

## 8. Summary of Concurrency-Safety Principles Applied

| Risk | Mitigation |
|---|---|
| Two simultaneous allocations for one asset | Partial unique DB index + `SELECT...FOR UPDATE` pre-check |
| Two overlapping bookings for one resource | GiST exclusion constraint + try/catch translation |
| Partial transfer (old closed, new not created) | Single DB transaction wrapping both operations |
| Maintenance approval without matching asset status flip | Same-transaction side effect, no separate endpoint can desync them |
| Duplicate scheduled-job notifications | Idempotency guard via activity_log lookback |
| Role changed mid-session (e.g. demoted) | Access token short-lived (e.g. 15 min); role re-checked from DB on refresh, not trusted from stale token claims indefinitely |
