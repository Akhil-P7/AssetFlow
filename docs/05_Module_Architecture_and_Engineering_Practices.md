# AssetFlow — Technical Spec 05: Module Architecture, Folder Structure & Engineering Practices

**Purpose:** Concrete project layout and coding patterns so implementation is consistent regardless of which engineer (or AI agent) picks up which module. Assumes NestJS-style backend (module/controller/service/repository) and React/TypeScript frontend; the patterns translate directly if the team chooses Django/Express/etc.

---

## 1. Backend Folder Structure

```
/backend
  /src
    /common
      /guards            (requireRole, requireDepartmentScope, requireAuditorAssignment)
      /decorators         (@CurrentUser, @Roles)
      /filters            (global exception filter -> maps ApiError to response envelope)
      /interceptors       (logging, response envelope wrapper)
      /pipes              (validation pipe config)
    /config               (env loading, DB connection config)
    /database
      /migrations         (numbered, one file per schema change from Spec 01)
      /seeds               (demo data script for Phase 6 seed/demo)
    /modules
      /auth                (signup, login, refresh, forgot/reset password)
      /org
        /departments
        /categories
        /employees
      /assets
      /allocations          (allocations + transfers together — tightly coupled domain)
      /bookings
      /maintenance
      /audits
      /notifications
      /activity-log
      /reports
      /dashboard
    /shared
      /state-machine        (ASSET_TRANSITIONS table + assertValidTransition, Spec 03 §1)
      /jobs                 (scheduled jobs, Spec 03 §6)
    main.ts
  /test
    /unit                   (per-module service tests)
    /integration             (multi-step workflow tests, e.g. full transfer flow)
    /concurrency              (race-condition tests, Spec 03 §8)
```

**Why `/shared/state-machine` is its own top-level folder, not inside `/modules/assets`:** the transition table is consumed by at least four modules (assets, allocations, maintenance, audits) — putting it inside one module's folder would create a circular/awkward dependency. Shared cross-cutting logic belongs in `/shared`, module-specific logic stays in its module.

Each module folder follows the same internal shape:
```
/allocations
  allocations.controller.ts     (routes from Spec 02 §4, thin — just guard + call service)
  allocations.service.ts        (business logic from Spec 03 §2)
  allocations.repository.ts     (raw queries / ORM calls, isolates SQL from business logic)
  allocations.dto.ts            (request/response schema validation)
  allocations.module.ts         (DI wiring)
```

**Layering discipline (applies to every module):**
- **Controller**: parses request, applies guard, calls service, returns response envelope. No business logic, no direct DB access.
- **Service**: owns transactions, calls `assertValidTransition`, orchestrates repository calls, triggers notifications/activity-log writes. This is where Spec 03's pseudocode lives.
- **Repository**: raw parameterized queries only. No business rules here — if a query needs `FOR UPDATE`, the service decided that, the repository just executes it.

This separation matters specifically because of the transaction-spanning side effects described in Spec 03 (e.g., maintenance approval touching both `maintenance_request` and `asset` tables) — those *must* live in the service layer where the transaction boundary is controlled, never split across two repository calls from different modules without a shared transaction context.

---

## 2. Cross-Module Interaction Pattern

Modules should not import each other's repositories directly (e.g., the maintenance module should not reach into the assets module's internal repository). Instead:

```typescript
// allocations.service.ts
constructor(
  private allocationRepo: AllocationRepository,
  private assetService: AssetService,      // <- public service interface, not repository
  private notificationService: NotificationService,
  private activityLogService: ActivityLogService,
) {}

async allocate(dto: CreateAllocationDto, actor: User, tx: Transaction) {
  // ... conflict check via allocationRepo ...
  await this.assetService.transitionStatus(assetId, 'ALLOCATED', 'allocation.create', actor, tx);
  // ...
}
```

`AssetService.transitionStatus()` is the *only* public entry point other modules use to change an asset's status — it internally calls `assertValidTransition` and performs the DB update. This guarantees the state-machine rule from Spec 03 §1 is enforced no matter which module triggers the change, because there's exactly one function in the codebase that's allowed to write `asset.status`.

All cross-module calls within a single business operation must accept and pass through the **same transaction/connection object** (`tx` above) — never open a second, independent transaction inside a call chain that's supposed to be atomic. This is what prevents partial-write bugs like "maintenance request approved but asset status update silently failed in a separate transaction."

---

## 3. Frontend Folder Structure

```
/frontend
  /src
    /api                  (typed API client — one file per module, mirrors Spec 02 exactly)
    /components
      /shared               (Button, Table, Modal, KPI Card, StatusBadge — reused across screens)
      /forms                 (RegisterAssetForm, AllocationForm, BookingForm, etc.)
    /screens                 (one folder per Screen 1-10 from the master plan)
      /auth
      /dashboard
      /org-setup
      /assets
      /allocations
      /bookings
      /maintenance
      /audits
      /reports
      /activity-notifications
    /hooks                  (useAuth, useRole, usePermission)
    /context                 (AuthContext — current user, role, department)
    /guards                  (RoleGuard component — hides/disables UI for unauthorized roles;
                               ALWAYS paired with server-side enforcement, never a substitute for it)
    /utils
```

**Frontend RBAC discipline:** `RoleGuard` components control what's *visible*, purely for UX (don't show an "Approve" button to an Employee). This is explicitly **not** a security boundary — every backend endpoint independently enforces its own guard per Spec 04, so even if someone bypasses the frontend (browser devtools, direct API calls), nothing unauthorized succeeds. This separation should be documented in code comments so future contributors don't mistake a hidden button for actual access control.

---

## 4. State Management (Frontend)

- Server state (assets, allocations, bookings, etc.): React Query / TanStack Query — handles caching, refetch-on-mutation, and keeps KPI/dashboard numbers fresh after any write action without manual cache-busting logic scattered everywhere.
- Client/UI state (form inputs, modal open/close): local component state or lightweight store (Zustand) — no need for Redux-scale machinery for a project this size.
- After any mutation that changes asset status (allocate, return, maintenance transitions, audit close), invalidate the relevant React Query cache keys (`assets`, `dashboard-kpis`) so the UI reflects the new state immediately without a manual refresh — this is what makes the Dashboard feel "real-time" per the requirement, without needing actual websockets/polling infrastructure for a hackathon-scale build. (If time allows, a lightweight polling interval on the dashboard, e.g. every 30s, is a reasonable upgrade.)

---

## 5. Testing Strategy — concrete test list

### Unit (service layer)
- `assertValidTransition`: every row in `ASSET_TRANSITIONS` table (positive case) + at least 5 illegal-jump negative cases (e.g. `ALLOCATED → DISPOSED` directly).
- `allocateAsset`: happy path; conflict path (asset already allocated); wrong-role rejection.
- `createBooking`: happy path; overlap rejection; boundary case (`endTime === otherStartTime` succeeds).
- Signup DTO: extra `role` field in payload is silently dropped, resulting employee has `role='EMPLOYEE'`.

### Integration (multi-step workflows)
- Full transfer: allocate → attempt second allocation (expect 409) → request transfer → approve → verify old allocation closed + new one active + history intact.
- Full maintenance: raise → approve (asset flips to Under Maintenance) → assign technician → start → resolve (asset flips back to Available).
- Full audit: create cycle with 2 auditors → mark 3 assets (Verified/Missing/Damaged) → close cycle → verify Missing asset is now `LOST`, discrepancy report contains Missing+Damaged, further edits to results are rejected.

### Concurrency
- Fire 10 simultaneous `POST /allocations` for the same asset; assert exactly 1 succeeds, 9 return `409 ALLOCATION_CONFLICT`.
- Fire 10 simultaneous overlapping `POST /bookings` for the same resource/slot; assert exactly 1 succeeds.

### RBAC matrix test
- Parametrized test: for each (endpoint, role) pair not in the allowed list per Spec 04 §4, assert `403`. Generate this test list directly from the permission matrix table so it can't silently drift from the spec.

---

## 6. Suggested Build Order Mapped to This Architecture (ties back to master plan Phases)

| Master Plan Phase | Concrete deliverables in this architecture |
|---|---|
| Phase 1 | `/common/guards`, `/modules/auth`, `/shared/state-machine` skeleton, all DB migrations from Spec 01 |
| Phase 2 | `/modules/org/*`, `/modules/assets`, seed script scaffold |
| Phase 3 | `/modules/allocations` (incl. transfers), `/modules/bookings`, `/modules/notifications` |
| Phase 4 | `/modules/maintenance`, `/modules/audits` |
| Phase 5 | `/modules/dashboard`, `/modules/reports`, `/shared/jobs` (all 3 scheduled jobs from Spec 03 §6) |
| Phase 6 | RBAC matrix test suite, seed data for demo, frontend `RoleGuard` pass, concurrency test suite |

---

## 7. Environment & Config Checklist

```
DATABASE_URL=postgres://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
OBJECT_STORAGE_BUCKET=...
OBJECT_STORAGE_KEY=...
OBJECT_STORAGE_SECRET=...
SMTP_HOST / SMTP_USER / SMTP_PASS   (or SES equivalent)
RATE_LIMIT_LOGIN=5/15m
CRON_OVERDUE_CHECK=*/15 * * * *
CRON_BOOKING_TRANSITION=*/5 * * * *
CRON_BOOKING_REMINDER=*/5 * * * *
```

---

## 8. How This Set of Documents Fits Together

| Document | Answers |
|---|---|
| Master Development Plan | *What* are we building and why, at a product level |
| 01 — Data Model & Schema | *What* does the data look like, and which rules are enforced by the database itself |
| 02 — API Specification | *What* is the contract between frontend and backend, endpoint by endpoint |
| 03 — Business Logic & State Machines | *How* each workflow's rules are actually executed, transaction by transaction |
| 04 — RBAC, Auth & Security | *How* access control and account safety are enforced, layer by layer |
| 05 — Module Architecture (this doc) | *Where* each piece of logic lives in the codebase, and how modules talk to each other safely |

Read together, these five documents plus the master plan are sufficient to implement AssetFlow without needing to re-derive any business rule from the original problem statement — every rule in the original PDF traces to a specific table constraint, service function, guard, or folder in this set.
