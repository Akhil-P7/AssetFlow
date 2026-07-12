# AssetFlow — Technical Spec 01: Data Model & Database Schema

**Purpose of this document:** This is a self-contained technical reference. An engineer or AI coding agent should be able to generate the full database layer from this document alone, without needing to re-read the original problem statement. Target DB: **PostgreSQL 14+** (chosen specifically for exclusion constraints, partial unique indexes, and JSONB — all used below to enforce business rules at the data layer, not just in application code).

---

## 0. Conventions used throughout

- All primary keys: `UUID DEFAULT gen_random_uuid()` (avoids sequential-ID enumeration attacks; `pgcrypto` extension required).
- All tables have `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()` (updated via trigger).
- "Soft delete" pattern: entities that other rows reference historically (Department, Employee, AssetCategory) use a `status` column (`Active`/`Inactive`) instead of `DELETE`. This is required, not optional — hard-deleting a Department that has historical Allocations would corrupt Reports.
- Money/cost fields: `NUMERIC(12,2)`, never `FLOAT` (avoids rounding errors in acquisition cost reporting).
- Enum-like fields are implemented as Postgres `ENUM` types (not free-text varchar) so illegal values are rejected by the database itself.

---

## 1. Extensions required

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- required for the booking exclusion constraint (§5.3)
```

---

## 2. Enum Types

```sql
CREATE TYPE employee_role AS ENUM ('EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN');
CREATE TYPE entity_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE asset_status AS ENUM (
  'AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'
);

CREATE TYPE allocation_status AS ENUM ('ACTIVE', 'CLOSED');

CREATE TYPE transfer_status AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');

CREATE TYPE booking_status AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

CREATE TYPE maintenance_status AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'
);
CREATE TYPE maintenance_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE audit_cycle_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE audit_result_value AS ENUM ('VERIFIED', 'MISSING', 'DAMAGED', 'PENDING');

CREATE TYPE notification_type AS ENUM (
  'ASSET_ASSIGNED', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED',
  'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER',
  'TRANSFER_APPROVED', 'OVERDUE_RETURN_ALERT', 'AUDIT_DISCREPANCY_FLAGGED'
);
```

---

## 3. Core Tables — Organization

```sql
CREATE TABLE department (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(120) NOT NULL,
  parent_department_id UUID REFERENCES department(id),
  department_head_id  UUID, -- FK to employee, added after employee table exists (circular ref)
  status              entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_not_own_parent CHECK (id <> parent_department_id)
);

CREATE TABLE employee (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         CITEXT UNIQUE NOT NULL,      -- CITEXT = case-insensitive text; requires citext extension
  password_hash TEXT NOT NULL,
  department_id UUID REFERENCES department(id),
  role          employee_role NOT NULL DEFAULT 'EMPLOYEE',
  status        entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE department
  ADD CONSTRAINT fk_department_head FOREIGN KEY (department_head_id) REFERENCES employee(id);

CREATE TABLE asset_category (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL UNIQUE,
  custom_fields JSONB NOT NULL DEFAULT '[]',
  -- custom_fields example: [{"key":"warranty_period_months","label":"Warranty Period","type":"number"}]
  status        entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Why JSONB for `custom_fields`:** Asset categories need per-category optional fields (e.g. warranty period for Electronics) without a schema migration every time a new category is added. `custom_fields` on the category defines the *schema*; the actual per-asset values live in `asset.custom_field_values` (JSONB, §4), validated against the category's schema at the application layer on write.

---

## 4. Core Table — Asset

```sql
CREATE SEQUENCE asset_tag_seq START 1;

CREATE TABLE asset (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag           VARCHAR(20) UNIQUE NOT NULL, -- generated as 'AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0')
  name                VARCHAR(160) NOT NULL,
  category_id         UUID NOT NULL REFERENCES asset_category(id),
  serial_number       VARCHAR(120) UNIQUE,
  acquisition_date    DATE,
  acquisition_cost    NUMERIC(12,2),
  condition           VARCHAR(40) NOT NULL DEFAULT 'Good', -- e.g. Excellent/Good/Fair/Poor
  location            VARCHAR(160),
  department_id       UUID REFERENCES department(id), -- "home" department, distinct from current allocation
  is_bookable         BOOLEAN NOT NULL DEFAULT FALSE,
  status              asset_status NOT NULL DEFAULT 'AVAILABLE',
  qr_code_url         TEXT,
  photo_urls          TEXT[] DEFAULT '{}',
  document_urls       TEXT[] DEFAULT '{}',
  custom_field_values JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_status ON asset(status);
CREATE INDEX idx_asset_category ON asset(category_id);
CREATE INDEX idx_asset_department ON asset(department_id);
CREATE INDEX idx_asset_search ON asset USING gin (
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(asset_tag,''))
);
```

`asset_tag` generation logic (application-side, inside the same transaction as insert):
```sql
SELECT 'AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0');
```
Using a DB sequence (not `MAX(id)+1` in application code) guarantees no collision under concurrent registrations.

---

## 5. Allocation, Transfer, and Booking — the conflict-critical tables

### 5.1 Allocation

```sql
CREATE TABLE allocation (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              UUID NOT NULL REFERENCES asset(id),
  employee_id           UUID REFERENCES employee(id),
  department_id         UUID REFERENCES department(id),
  allocated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_return_date  DATE,
  returned_at           TIMESTAMPTZ,
  return_condition_note TEXT,
  status                allocation_status NOT NULL DEFAULT 'ACTIVE',
  created_by            UUID NOT NULL REFERENCES employee(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_holder_present CHECK (employee_id IS NOT NULL OR department_id IS NOT NULL)
);
```

**The core anti-double-allocation rule**, enforced by the database itself so no application bug can bypass it:

```sql
CREATE UNIQUE INDEX uq_one_active_allocation_per_asset
  ON allocation (asset_id)
  WHERE status = 'ACTIVE';
```

A partial unique index means: *at most one row with `status = 'ACTIVE'` may exist per `asset_id`*. Any attempt to `INSERT` a second active allocation for an already-allocated asset throws a unique-violation error at the DB level. The application layer catches this specific error and returns the friendly "currently held by X, request a transfer instead" response — but the actual guarantee lives in the database, immune to race conditions between two simultaneous allocation requests.

**Recommended transaction pattern for allocating:**
```sql
BEGIN;
  SELECT * FROM allocation WHERE asset_id = :assetId AND status = 'ACTIVE' FOR UPDATE;
  -- if a row is returned -> abort, return "currently held by" response
  -- if no row -> proceed
  INSERT INTO allocation (asset_id, employee_id, department_id, expected_return_date, created_by)
    VALUES (:assetId, :employeeId, :departmentId, :expectedReturn, :actorId);
  UPDATE asset SET status = 'ALLOCATED' WHERE id = :assetId;
COMMIT;
```
`FOR UPDATE` row-locks the asset's allocation rows for the duration of the transaction, closing the race window between the `SELECT` check and the `INSERT`.

### 5.2 Transfer Request

```sql
CREATE TABLE transfer_request (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id    UUID NOT NULL REFERENCES allocation(id),
  asset_id         UUID NOT NULL REFERENCES asset(id),
  requested_by     UUID NOT NULL REFERENCES employee(id),
  to_employee_id   UUID REFERENCES employee(id),
  to_department_id UUID REFERENCES department(id),
  status           transfer_status NOT NULL DEFAULT 'REQUESTED',
  approved_by      UUID REFERENCES employee(id),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_transfer_target CHECK (to_employee_id IS NOT NULL OR to_department_id IS NOT NULL)
);
```

**Approval side-effect (single transaction, application-orchestrated):**
```sql
BEGIN;
  UPDATE transfer_request SET status='APPROVED', approved_by=:approverId, approved_at=now()
    WHERE id=:transferId;
  UPDATE allocation SET status='CLOSED', returned_at=now()
    WHERE id=(SELECT allocation_id FROM transfer_request WHERE id=:transferId);
  INSERT INTO allocation (asset_id, employee_id, department_id, created_by)
    VALUES (:assetId, :toEmployeeId, :toDepartmentId, :approverId);
  UPDATE transfer_request SET status='COMPLETED' WHERE id=:transferId;
  -- asset.status remains 'ALLOCATED' throughout; no change needed
COMMIT;
```
Closing the old allocation and inserting the new one inside one transaction is what prevents a partially-applied transfer (e.g., old allocation closed but new one failed to insert, leaving the asset orphaned).

### 5.3 Booking — overlap-proof by construction

```sql
CREATE TABLE booking (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  UUID NOT NULL REFERENCES asset(id), -- must have is_bookable = true
  booked_by    UUID NOT NULL REFERENCES employee(id),
  booked_for_department_id UUID REFERENCES department(id), -- optional: dept head booking on behalf of dept
  time_range   TSTZRANGE NOT NULL,
  status       booking_status NOT NULL DEFAULT 'UPCOMING',
  cancelled_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**The overlap-prevention constraint** — this is the single most important line in the schema for Screen 6:

```sql
ALTER TABLE booking
  ADD CONSTRAINT excl_no_overlap_per_resource
  EXCLUDE USING gist (
    resource_id WITH =,
    time_range WITH &&
  ) WHERE (status IN ('UPCOMING', 'ONGOING'));
```

How to read this: for a given `resource_id`, no two rows may have `time_range` values that overlap (`&&` is the range-overlap operator), as long as both rows are in an active status (`UPCOMING`/`ONGOING`). Cancelled/Completed bookings are excluded from the constraint so history isn't blocked from existing.

`TSTZRANGE` boundary semantics matter here: by default a range like `[9:30, 10:30)` is **inclusive of the start, exclusive of the end**. This exactly matches the spec's example — a booking ending at 10:00 and one starting at 10:00 do *not* overlap, because `[9:00,10:00) && [10:00,11:00)` evaluates to `false`. No special-casing needed; the range type's default semantics already match the requirement.

**Insert pattern:**
```sql
INSERT INTO booking (resource_id, booked_by, time_range)
VALUES (:resourceId, :employeeId, tstzrange(:startTime, :endTime, '[)'));
```
If this violates the exclusion constraint, Postgres raises `23P01 (exclusion_violation)`; the application catches this and returns "This slot overlaps with an existing booking."

---

## 6. Maintenance

```sql
CREATE TABLE maintenance_request (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID NOT NULL REFERENCES asset(id),
  raised_by     UUID NOT NULL REFERENCES employee(id),
  issue_description TEXT NOT NULL,
  priority      maintenance_priority NOT NULL DEFAULT 'MEDIUM',
  photo_url     TEXT,
  status        maintenance_status NOT NULL DEFAULT 'PENDING',
  approved_by   UUID REFERENCES employee(id),
  technician_name VARCHAR(120),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_maintenance_asset ON maintenance_request(asset_id);
CREATE INDEX idx_maintenance_status ON maintenance_request(status);
```

Asset-status side effects (enforced in service layer, see Spec 03 for full pseudocode):
- transition to `APPROVED` → `UPDATE asset SET status='UNDER_MAINTENANCE' WHERE id=:assetId`
- transition to `RESOLVED` → `UPDATE asset SET status='AVAILABLE' WHERE id=:assetId`, `resolved_at = now()`

Both updates happen in the **same transaction** as the maintenance_request status update.

---

## 7. Audit Cycle

```sql
CREATE TABLE audit_cycle (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_department_id UUID REFERENCES department(id),
  scope_location      VARCHAR(160),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              audit_cycle_status NOT NULL DEFAULT 'OPEN',
  created_by          UUID NOT NULL REFERENCES employee(id),
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_date_range CHECK (end_date >= start_date)
);

CREATE TABLE audit_assignment (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_cycle_id UUID NOT NULL REFERENCES audit_cycle(id),
  auditor_id     UUID NOT NULL REFERENCES employee(id),
  UNIQUE (audit_cycle_id, auditor_id)
);

CREATE TABLE audit_result (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_cycle_id UUID NOT NULL REFERENCES audit_cycle(id),
  asset_id       UUID NOT NULL REFERENCES asset(id),
  result         audit_result_value NOT NULL DEFAULT 'PENDING',
  notes          TEXT,
  verified_by    UUID REFERENCES employee(id),
  verified_at    TIMESTAMPTZ,
  UNIQUE (audit_cycle_id, asset_id)
);
```

**Closing a cycle** (application-orchestrated transaction):
```sql
BEGIN;
  UPDATE audit_cycle SET status='CLOSED', closed_at=now() WHERE id=:cycleId AND status='OPEN';
  -- if 0 rows affected -> already closed, abort with error (idempotency guard)
  UPDATE asset SET status='LOST'
    WHERE id IN (SELECT asset_id FROM audit_result WHERE audit_cycle_id=:cycleId AND result='MISSING');
COMMIT;
```
After this transaction, application logic should treat `audit_result` rows belonging to a `CLOSED` cycle as immutable — enforce this with a `BEFORE UPDATE` trigger that raises an exception if the parent cycle is closed, rather than relying on application discipline alone:

```sql
CREATE OR REPLACE FUNCTION prevent_closed_audit_edit() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT status FROM audit_cycle WHERE id = OLD.audit_cycle_id) = 'CLOSED' THEN
    RAISE EXCEPTION 'Cannot modify results of a closed audit cycle';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_closed_audit
  BEFORE UPDATE ON audit_result
  FOR EACH ROW EXECUTE FUNCTION prevent_closed_audit_edit();
```

---

## 8. Notifications & Activity Log

```sql
CREATE TABLE notification (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES employee(id),
  type         notification_type NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}', -- e.g. {"assetTag":"AF-0114","bookingId":"..."}
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_recipient_unread ON notification(recipient_id) WHERE read_at IS NULL;

CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES employee(id), -- nullable for system/cron-triggered actions
  action      VARCHAR(80) NOT NULL,          -- e.g. 'ALLOCATION_CREATED', 'ROLE_PROMOTED'
  entity_type VARCHAR(60) NOT NULL,          -- e.g. 'asset', 'allocation', 'employee'
  entity_id   UUID NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',   -- before/after snapshot or relevant details
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_actor ON activity_log(actor_id);
```

`activity_log` is append-only (no UPDATE/DELETE grants in application role permissions) — it is the audit trail of the audit trail, and its integrity matters more than any other table's.

---

## 9. Full Entity Relationship Summary

```
Department 1──* Employee
Department 1──* Department (self, parent hierarchy)
Department 1──1 Employee (department_head_id)

AssetCategory 1──* Asset

Asset 1──* Allocation
Asset 1──* Booking
Asset 1──* MaintenanceRequest
Asset 1──* AuditResult

Allocation 1──* TransferRequest
Employee 1──* Allocation (as holder, and as creator)
Department 1──* Allocation (as holder)

AuditCycle 1──* AuditAssignment (auditor pool)
AuditCycle 1──* AuditResult

Employee 1──* Notification (recipient)
Employee 1──* ActivityLog (actor)
```

---

## 10. Migration Ordering (dependency-safe)

1. Extensions + enum types
2. `department` (without FK to employee yet)
3. `employee`
4. `ALTER TABLE department ADD FK department_head_id`
5. `asset_category`
6. `asset` (+ sequence, indexes)
7. `allocation` (+ partial unique index)
8. `transfer_request`
9. `booking` (+ btree_gist extension, exclusion constraint)
10. `maintenance_request`
11. `audit_cycle`, `audit_assignment`, `audit_result` (+ trigger)
12. `notification`, `activity_log`

This ordering avoids forward-referencing a table that doesn't exist yet, with the one deliberate exception of `department.department_head_id`, resolved via a post-creation `ALTER TABLE`.
