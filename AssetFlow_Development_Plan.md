# AssetFlow — Enterprise Asset & Resource Management System
## Comprehensive Development Plan

---

## 1. Understanding the Problem

AssetFlow is a **generic, industry-agnostic ERP module** for tracking physical assets (equipment, furniture, vehicles) and shared resources (rooms, vehicles, equipment slots) across any organization. It deliberately stays out of purchasing, invoicing, and accounting — its job is **lifecycle visibility, allocation integrity, booking integrity, maintenance governance, and audit discipline.**

Three things make this more than a CRUD app, and the plan below is built around them:

1. **State integrity** — an asset's lifecycle (Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed) must never be violated by two workflows fighting over the same asset.
2. **Conflict prevention as a first-class feature** — double-allocation and overlapping bookings must be blocked at the data/service layer, not just the UI.
3. **Role-gated trust** — nobody self-assigns power. Every account starts as Employee; elevation only happens through an auditable Admin action.

### Explicit Non-Goals
- No purchasing / procurement workflow
- No invoicing or accounting integration (acquisition cost is a stored attribute only, for reporting/ranking)
- No payroll or HR management beyond the minimal employee directory needed for allocation

---

## 2. User Roles & Permission Matrix

| Capability | Admin | Asset Manager | Department Head | Employee |
|---|---|---|---|---|
| Create departments / categories | ✅ | ❌ | ❌ | ❌ |
| Promote Employee → Dept Head / Asset Manager | ✅ | ❌ | ❌ | ❌ |
| Register / edit assets | ✅ | ✅ | ❌ | ❌ |
| Allocate / transfer assets | ✅ | ✅ | ✅ (dept-scoped approval) | Request only |
| Approve transfers | ✅ | ✅ | ✅ (own dept) | ❌ |
| Book shared resources | ✅ | ✅ | ✅ | ✅ |
| Raise maintenance request | ✅ | ✅ | ✅ | ✅ |
| Approve/reject maintenance | ✅ | ✅ | ❌ | ❌ |
| Create / close audit cycles | ✅ | ✅ | ❌ | ❌ |
| Perform audit verification | ✅ | ✅ | Assigned auditors only | Assigned auditors only |
| View org-wide reports | ✅ | ✅ (asset-scoped) | Dept-scoped | Self-scoped |
| View activity logs | ✅ (all) | Scoped | Scoped | Own actions |

This matrix should be enforced **server-side** via middleware, not just conditionally hidden UI elements — a recurring theme below.

---

## 3. Functional Modules (mapped to the 10 required screens)

### 3.1 Authentication & Onboarding
- Signup → creates an `Employee` record with role `EMPLOYEE`, status `Active`, no role picker exposed in the UI or accepted by the API.
- Login with email/password, JWT (access + refresh token) or session-based auth.
- Forgot password via email token (short-lived, single-use).
- Session validation middleware on every protected route.
- **Improvement:** basic rate-limiting on login attempts and password reset requests to prevent brute-force/enumeration abuse.

### 3.2 Dashboard
- Role-aware KPI cards, computed server-side per request (not cached client math): Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns.
- Overdue section is a **separate query** (Expected Return Date < today AND status = Allocated), not a filtered slice of "upcoming," so it can't silently get lost in pagination.
- Quick actions route directly into pre-filled forms (Register Asset, Book Resource, Raise Maintenance Request).

### 3.3 Organization Setup (Admin-only, 3 tabs)
- **Departments:** CRUD + Active/Inactive + optional Parent Department (self-referencing FK) → supports org-chart style hierarchy and dept-scoped rollups in reports.
- **Asset Categories:** CRUD + dynamic optional fields (e.g., warranty period) — implemented as a flexible key/value or JSON-schema attribute set per category, so new categories don't need schema migrations.
- **Employee Directory:** CRUD (deactivate, not hard-delete, to preserve history integrity), and the *only* surface where role promotion happens. Every promotion writes an activity-log entry (who promoted whom, when, from what role).

### 3.4 Asset Registration & Directory
- Registration: Name, Category, **auto-generated Asset Tag** (sequential, e.g. `AF-0001`, generated server-side to avoid collisions), Serial Number (unique), Acquisition Date, Acquisition Cost, Condition, Location, photos/docs, `is_bookable` flag.
- Search/filter across Asset Tag, Serial Number, QR code, category, status, department, location — backed by indexed columns + full-text search on name/serial/tag.
- Per-asset detail page shows combined timeline: allocation history + maintenance history, newest first.
- **Improvement:** auto-generate a scannable QR code per asset at registration time (encodes the Asset Tag) to support fast mobile lookup during audits — this directly strengthens the Audit module without adding new business rules.

### 3.5 Asset Allocation & Transfer
- Allocate to employee or department, optional Expected Return Date.
- **Conflict rule enforced at the service layer with a DB constraint, not just an app check:** an asset can have at most one *active* allocation record at a time (unique partial index on `asset_id` where `status = 'active'`). If a second allocation is attempted, the API returns the current holder and the UI surfaces "currently held by Priya" + a **Transfer Request** action instead of a blind error.
- Transfer state machine: `Requested → Approved → Re-allocated` (Approved by Asset Manager or the relevant Department Head); approval automatically closes the old allocation record and opens a new one inside a single transaction, so history is never a partial write.
- Return flow: condition check-in notes required, asset status reverts to `Available`, allocation record closed with `returned_at` timestamp.
- Overdue detection is a scheduled job (see §6) that flags allocations past Expected Return Date and pushes to Dashboard + Notifications rather than being computed on every page load.

### 3.6 Resource Booking
- Calendar view per resource, pulling only bookings with status Upcoming/Ongoing to keep the view relevant.
- **Overlap validation:** enforced via a DB-level exclusion constraint on `(resource_id, time_range)` using a range type (e.g., Postgres `tstzrange` + `EXCLUDE USING gist`), backed by an application-level pre-check for a fast, friendly error message. This guarantees correctness even under concurrent booking attempts, which a pure application-layer check cannot.
- Booking status lifecycle: `Upcoming → Ongoing → Completed` (auto-transitioned by a scheduler) and `Cancelled` (user-triggered).
- Reminder notification fired X minutes before slot start via the scheduled job.

### 3.7 Maintenance Management
- Raise request: asset, issue description, priority, photo attachment.
- Workflow: `Pending → Approved/Rejected → Technician Assigned → In Progress → Resolved`.
- Asset status auto-syncs: flips to `Under Maintenance` on Approval, back to `Available` on Resolved — implemented as a state-transition side-effect inside the same transaction that updates the maintenance request, so asset status and maintenance status can never drift apart.
- Full maintenance history retained per asset (never deleted, only status-transitioned).

### 3.8 Asset Audit
- Create Audit Cycle: scope (department and/or location), date range, one or more assigned auditors.
- Auditor view: checklist of in-scope assets, mark each `Verified / Missing / Damaged`.
- System auto-compiles a discrepancy report from anything not marked Verified.
- Closing a cycle is a guarded, one-way transition: locks further edits, and bulk-updates affected asset statuses (e.g., confirmed-missing → `Lost`).
- Full audit history retained per cycle for trend reporting.

### 3.9 Reports & Analytics
- Utilization trends (most-used vs. idle assets) computed from allocation + booking duration data.
- Maintenance frequency by asset/category.
- Assets due for maintenance or nearing retirement (age/condition threshold based).
- Department-wise allocation summary.
- Booking heatmap by time-of-day/day-of-week.
- Exportable as CSV/PDF.

### 3.10 Activity Logs & Notifications
- Every state-changing action writes a structured log entry: actor, action, entity, before/after (where relevant), timestamp — this becomes the single source of truth for both the Activity Log screen and dispute resolution ("who approved this transfer?").
- Notification triggers map 1:1 to the events already defined in workflows above (Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged) — no extra notification types invented, kept tightly scoped to what the problem statement asks for.
- In-app notification center + optional email digest.

---

## 4. Asset Lifecycle State Machine

```
                 ┌─────────────┐
        register │             │
        ────────▶│  Available  │◀────────────────┐
                  │             │                 │
                  └──┬───┬───┬──┘                 │
        allocate     │   │   │   book              │ return / resolve
                      │   │   └────────┐            │
                      ▼   │            ▼            │
              ┌───────────┴─┐   ┌────────────┐      │
              │  Allocated   │   │  Reserved  │      │
              └──────┬───────┘   └─────┬──────┘      │
                     │  raise+approve  │ completed    │
                     │  maintenance    │ (auto)        │
                     ▼                 └──────────────┘
            ┌───────────────────┐
            │ Under Maintenance │────────────────────▶ back to Available on Resolved
            └─────────┬─────────┘
                       │ audit: confirmed missing
                       ▼
                  ┌─────────┐        end-of-life        ┌───────────┐
                  │  Lost   │──────────────────────────▶│  Retired  │
                  └─────────┘                            └─────┬─────┘
                                                                 │ disposal process
                                                                 ▼
                                                           ┌───────────┐
                                                           │ Disposed  │ (terminal)
                                                           └───────────┘
```

Implementation note: model this explicitly as a **state transition table** (`from_state`, `to_state`, `allowed_roles`, `triggering_event`) rather than scattering `if` checks across controllers. Any transition not in the table is rejected at the API layer — this is what keeps "Allocated → Disposed" (an illegal skip) impossible regardless of which screen someone tries it from.

---

## 5. Core Data Model (entities & key relationships)

- **Department** (id, name, parent_department_id FK→self, department_head_id FK→Employee, status)
- **Employee** (id, name, email, password_hash, department_id FK, role [Employee/DeptHead/AssetManager/Admin], status)
- **AssetCategory** (id, name, custom_fields JSON schema)
- **Asset** (id, asset_tag [unique, auto-gen], name, category_id FK, serial_number [unique], acquisition_date, acquisition_cost, condition, location, is_bookable, status, qr_code)
- **Allocation** (id, asset_id FK, employee_id FK nullable, department_id FK nullable, allocated_at, expected_return_date, returned_at nullable, condition_note, status [active/closed])
- **TransferRequest** (id, allocation_id FK, requested_by FK, approved_by FK nullable, from_holder, to_holder, status, timestamps)
- **Booking** (id, resource_asset_id FK, booked_by FK, start_time, end_time, status, cancelled_reason nullable)
- **MaintenanceRequest** (id, asset_id FK, raised_by FK, issue_description, priority, photo_url, status, approved_by FK nullable, technician_name, resolved_at)
- **AuditCycle** (id, scope_department_id FK nullable, scope_location, start_date, end_date, status [open/closed])
- **AuditAssignment** (id, audit_cycle_id FK, auditor_id FK)
- **AuditResult** (id, audit_cycle_id FK, asset_id FK, result [Verified/Missing/Damaged], notes)
- **Notification** (id, recipient_id FK, type, payload, read_at nullable, created_at)
- **ActivityLog** (id, actor_id FK, action, entity_type, entity_id, metadata JSON, created_at)

All FKs to Employee/Department use soft-delete (`status = Inactive`) rather than hard deletes, preserving referential integrity for historical reports.

---

## 6. System Architecture

### Suggested Stack
| Layer | Recommendation | Why |
|---|---|---|
| Frontend | React + TypeScript, Tailwind CSS | Component reuse across 10 screens, strong typing for role-gated UI |
| Backend | Node.js (NestJS) or Django (Python) | Both give you structured modules, guards/middleware for RBAC, built-in ORM migrations |
| Database | PostgreSQL | Range types + exclusion constraints (booking overlap), JSONB (category custom fields), strong relational integrity for lifecycle states |
| Auth | JWT (access + refresh) or session cookies + bcrypt/argon2 hashing | Standard, stateless-friendly |
| Background jobs | Cron-based scheduler (e.g., node-cron / Celery beat) | Overdue detection, booking status auto-transitions, reminder notifications |
| File storage | S3-compatible object storage | Asset photos, maintenance photos, documents |
| Notifications | In-app table + optional email via SMTP/SES | Matches the notification list exactly; no over-engineering into SMS/push unless required |
| Deployment | Docker Compose for dev; single cloud VM or container service for hackathon demo | Fast, reproducible, judge-friendly |

### High-Level Architecture Diagram
```
┌────────────┐      ┌───────────────────┐      ┌──────────────┐
│  React SPA │◀────▶│  REST API (NestJS)│◀────▶│  PostgreSQL  │
└────────────┘      │  - Auth/RBAC guard│      └──────────────┘
                     │  - Module routers │
                     │  - State machine  │
                     │    engine         │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │  Scheduled Jobs   │  (overdue checks, booking
                     │  (cron)           │   status transitions, reminders)
                     └───────────────────┘
                               │
                     ┌─────────▼─────────┐
                     │  Notification /   │
                     │  Activity Log     │
                     │  service          │
                     └───────────────────┘
```

### Module Boundaries (backend)
Organize the backend into **independent, reusable modules** matching the domain, not the screens — this is what the problem statement means by "clean architecture, reusable modules":
`auth`, `org` (departments/categories/employees), `assets`, `allocations`, `bookings`, `maintenance`, `audits`, `notifications`, `activity-log`, `reports`. Each module exposes its own service layer; cross-module interaction (e.g., maintenance approval flipping asset status) happens through explicit service calls, not shared mutable state — keeps modules testable in isolation.

---

## 7. Key Business Rules Summary (the parts most likely to break under naive implementation)

1. **No double allocation** — unique constraint on active allocations per asset, checked inside a DB transaction with row-level locking (`SELECT ... FOR UPDATE`) to survive concurrent requests.
2. **No overlapping bookings** — DB exclusion constraint + application pre-check; boundary case explicitly handled (a booking ending at 10:00 and one starting at 10:00 do **not** overlap, per the example given).
3. **No self-elevation** — signup endpoint hard-codes role = Employee server-side; role field is not accepted from the signup payload at all, regardless of what the client sends.
4. **Maintenance can't bypass approval** — asset status only flips to Under Maintenance as a side-effect of the Approved transition, never directly settable via a generic "edit asset" endpoint.
5. **Audit closure is irreversible** — once an Audit Cycle is closed, its AuditResults become read-only; a closed cycle can only be referenced, not edited, to preserve audit trail integrity.
6. **Illegal lifecycle jumps are rejected** — enforced via the state-transition table (§4), not scattered conditionals.

---

## 8. Suggested Improvements (within scope — no new business concepts introduced)

These strengthen the product without touching purchasing/invoicing/accounting or adding requirements beyond what's asked:

- **QR code generation per asset** — directly supports the existing "search by QR code" requirement and speeds up audit verification.
- **DB-level constraints for conflict rules**, not just application checks — makes the two explicitly-called-out conflict rules (allocation, booking) actually race-condition-proof.
- **Soft delete everywhere** — deactivating rather than deleting departments/employees/categories preserves historical report accuracy, which the Reports screen depends on.
- **Structured state-transition table** for asset lifecycle — turns "assets can transition between states" into an enforceable, auditable rule set instead of implicit logic.
- **Rate limiting on auth endpoints** — a normal expectation for a "realistic, non-self-elevating" account system.
- **CSV/PDF export on Reports screen** — the problem statement already asks for "exportable reports"; specifying format keeps this concrete for implementation.
- **Responsive layout from day one** (not a separate mobile app) — matches "responsive application" in the mission statement without adding a new platform to build.

---

## 9. Development Phases (suggested for a hackathon timeline)

### Phase 1 — Foundation
- Repo setup, CI, Docker Compose dev environment
- DB schema + migrations for all entities in §5
- Auth module: signup (Employee-only), login, forgot password, session/JWT middleware
- RBAC guard scaffolding used by every subsequent module

### Phase 2 — Master Data & Core Registry
- Organization Setup screen (Departments, Categories, Employee Directory + role promotion)
- Asset Registration & Directory screen (incl. auto Asset Tag, QR generation, search/filter)
- Activity Log service wired into every write operation from this point forward

### Phase 3 — Core Workflows
- Allocation & Transfer module (conflict rule + transfer state machine)
- Resource Booking module (overlap constraint + calendar view)
- Notification service (in-app) wired to both modules

### Phase 4 — Governance Workflows
- Maintenance Management (approval workflow + asset status sync)
- Asset Audit (cycle creation, auditor assignment, discrepancy report, cycle closure)

### Phase 5 — Insight Layer
- Dashboard KPIs + overdue detection scheduled job
- Reports & Analytics screen (utilization, maintenance frequency, dept summary, booking heatmap, export)
- Booking status auto-transition scheduled job (Upcoming → Ongoing → Completed)

### Phase 6 — Polish & Demo Readiness
- Role-based UI pass (confirm nothing is reachable outside the permission matrix in §2)
- End-to-end test of the full basic workflow described in the problem statement (Admin sets up org → Asset Manager registers asset → allocation blocked/transfer path → booking overlap rejected → maintenance approval → audit cycle → notifications/logs)
- Seed data script for a convincing live demo
- Responsive/UI polish pass

---

## 10. Testing Strategy

- **Unit tests** on business-rule-heavy services: allocation conflict check, booking overlap check, lifecycle transition table, role-elevation guard.
- **Integration tests** on the full transfer workflow and the full maintenance workflow (multi-step, multi-role).
- **Concurrency test**: fire two simultaneous allocation/booking requests for the same asset/resource and assert exactly one succeeds.
- **RBAC test matrix**: for each role, assert access/denial against every protected endpoint per §2.

---

## 11. Demo Script (for judging/presentation)

A tight walkthrough that hits every required rule in ~5 minutes:
1. Admin creates a department, a category, and promotes an Employee to Asset Manager.
2. Asset Manager registers an asset → status `Available`, QR/tag visible.
3. Allocate to Employee A; attempt to allocate the same asset to Employee B → blocked, "currently held by A" shown, Transfer Request offered instead.
4. Employee A books Room B2 9:00–10:00; a conflicting 9:30–10:30 request is rejected; a 10:00–11:00 request succeeds.
5. Employee raises a maintenance request on their allocated asset; Asset Manager approves → asset flips to Under Maintenance; resolve → back to Available.
6. Admin/Asset Manager creates an Audit Cycle, assigns an auditor, auditor marks one asset Missing; closing the cycle flips it to Lost and generates a discrepancy report.
7. Dashboard and Notification/Activity Log screens show everything above reflected in real time.

---

This plan covers every screen, role, and business rule in the problem statement, keeps strictly out of purchasing/invoicing/accounting, and adds only implementation-level hardening (DB constraints, state-transition tables, QR codes, soft deletes) rather than new product scope — so it stays fully aligned with what's being asked while giving the team a build order that de-risks the trickiest parts (conflict handling, state integrity) early.
