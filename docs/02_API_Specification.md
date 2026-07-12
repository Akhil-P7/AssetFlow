# AssetFlow — Technical Spec 02: API Specification

**Purpose:** Complete REST contract for every module. Base path: `/api/v1`. All endpoints except `POST /auth/signup`, `POST /auth/login`, and `POST /auth/forgot-password` require a valid `Authorization: Bearer <token>` header. Every endpoint additionally enforces the role matrix from the master plan (§2) via a route guard — the specific required role(s) is noted per endpoint as `Roles:`.

Response envelope convention (used consistently):
```json
// success
{ "success": true, "data": { ... } }
// error
{ "success": false, "error": { "code": "ALLOCATION_CONFLICT", "message": "...", "details": { ... } } }
```

---

## 1. Auth Module (`/auth`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Creates Employee account. **Ignores any `role` field in the payload** — always sets `EMPLOYEE`. |
| POST | `/auth/login` | Public | Returns `{ accessToken, refreshToken, user }`. Rate-limited (see §9). |
| POST | `/auth/refresh` | Public (valid refresh token) | Issues new access token. |
| POST | `/auth/logout` | Authenticated | Invalidates refresh token (server-side blacklist or rotation). |
| POST | `/auth/forgot-password` | Public | Sends single-use, time-limited (e.g. 30 min) reset token via email. Rate-limited. |
| POST | `/auth/reset-password` | Public (valid reset token) | Sets new password; invalidates all existing sessions for that user. |
| GET | `/auth/me` | Authenticated | Returns current user profile + role + department. |

**Signup request:**
```json
POST /auth/signup
{ "name": "Priya Shah", "email": "priya@org.com", "password": "..." }
```
Server-side enforcement: the DTO/validation schema for this endpoint literally has no `role` field defined — even if a client sends one, deserialization drops it before it reaches the service layer. This is the technical implementation of "no self-elevation."

---

## 2. Organization Module (`/org`)

### 2.1 Departments
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/org/departments` | All authenticated | List (paginated, filter by status). |
| GET | `/org/departments/:id` | All authenticated | Detail incl. parent + children. |
| POST | `/org/departments` | Admin | Create. Body: `{ name, parentDepartmentId?, departmentHeadId? }` |
| PATCH | `/org/departments/:id` | Admin | Edit name/parent/head. |
| PATCH | `/org/departments/:id/status` | Admin | `{ status: "INACTIVE" }` (soft delete). |

### 2.2 Asset Categories
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/org/categories` | All authenticated | List. |
| POST | `/org/categories` | Admin | `{ name, customFields: [{key, label, type}] }` |
| PATCH | `/org/categories/:id` | Admin | Edit name/customFields/status. |

### 2.3 Employee Directory
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/org/employees` | Admin, Asset Manager (read-only), Department Head (dept-scoped) | List/search/filter by department, role, status. |
| GET | `/org/employees/:id` | Self, Admin, relevant Dept Head | Detail. |
| PATCH | `/org/employees/:id` | Admin | Edit name/department/status. |
| **POST** | **`/org/employees/:id/promote`** | **Admin only** | **`{ newRole: "DEPARTMENT_HEAD" \| "ASSET_MANAGER" }`. This is the only endpoint in the entire system capable of changing an employee's role. Writes an `activity_log` entry with `action='ROLE_PROMOTED'` including old and new role in `metadata`.** |

---

## 3. Asset Module (`/assets`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/assets` | All authenticated | Search/filter: `?q=&category=&status=&department=&location=&bookable=` — `q` hits the GIN full-text index on tag/name/serial. |
| GET | `/assets/:id` | All authenticated | Full detail. |
| GET | `/assets/:id/history` | All authenticated | Merged, time-sorted allocation + maintenance history. |
| GET | `/assets/tag/:assetTag` | All authenticated | Lookup by scanned QR/tag (fast path for audit mobile flow). |
| POST | `/assets` | Admin, Asset Manager | Create. Server generates `assetTag` and `qrCodeUrl`; body carries name/category/serial/etc. Status defaults `AVAILABLE`. |
| PATCH | `/assets/:id` | Admin, Asset Manager | Edit descriptive fields only — **`status` is intentionally not editable through this endpoint** (see §5). |
| POST | `/assets/:id/photos` | Admin, Asset Manager | Upload photo(s), returns updated `photoUrls`. |

**Why `status` is excluded from the generic PATCH:** if a generic edit endpoint could set `status`, someone could set `Under Maintenance → Available` bypassing the maintenance-resolution workflow, or `Available → Disposed` skipping the lifecycle rules. Status changes only happen as side effects of the specific workflow endpoints below (allocate, return, maintenance approve/resolve, audit close) or via a dedicated guarded endpoint:

| POST | `/assets/:id/transition` | Admin, Asset Manager | `{ toStatus, reason }` — manual override path, validated against the state-transition table (Spec 03 §1), logged with `action='MANUAL_STATUS_OVERRIDE'`. |

---

## 4. Allocation & Transfer Module (`/allocations`, `/transfers`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/allocations` | Scoped (self / dept / all) | Filter by asset, employee, department, status, overdue=true. |
| POST | `/allocations` | Admin, Asset Manager, Department Head (own dept) | `{ assetId, employeeId?, departmentId?, expectedReturnDate? }`. **Returns `409 Conflict` with `{ code: "ALLOCATION_CONFLICT", currentHolder: {...} }` if the asset already has an active allocation** — this is the exact trigger for the UI's "currently held by X, request transfer?" prompt. |
| POST | `/allocations/:id/return` | Admin, Asset Manager, holder themself | `{ conditionNote }`. Closes allocation, reverts asset to `AVAILABLE`. |
| POST | `/transfers` | Any authenticated (on an asset allocated to them or visible to them) | `{ allocationId, toEmployeeId? , toDepartmentId? }`. Status starts `REQUESTED`. |
| GET | `/transfers` | Scoped | List pending transfers relevant to the caller's approval scope. |
| POST | `/transfers/:id/approve` | Asset Manager, Department Head (own dept) | Executes the transaction in Spec 01 §5.2. |
| POST | `/transfers/:id/reject` | Asset Manager, Department Head (own dept) | `{ reason }`. |

**Allocation conflict response example:**
```json
409 Conflict
{
  "success": false,
  "error": {
    "code": "ALLOCATION_CONFLICT",
    "message": "Asset AF-0114 is currently held by Priya Shah.",
    "details": { "currentHolder": { "employeeId": "...", "name": "Priya Shah" }, "allocationId": "..." }
  }
}
```

---

## 5. Booking Module (`/bookings`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/bookings` | All authenticated | Filter by resource, requester, status, date range — powers calendar view. |
| GET | `/bookings/resource/:assetId/calendar` | All authenticated | Returns bookings for one bookable resource in a date window. |
| POST | `/bookings` | All authenticated | `{ resourceId, startTime, endTime, bookedForDepartmentId? }`. **Returns `409 Conflict` with `{ code: "BOOKING_OVERLAP" }` if it collides** with the DB exclusion constraint (Spec 01 §5.3). |
| POST | `/bookings/:id/cancel` | Booking owner, Admin, Asset Manager | `{ reason? }`. |
| PATCH | `/bookings/:id/reschedule` | Booking owner | `{ startTime, endTime }` — implemented as cancel + re-create inside one transaction, so it goes through the same overlap check. |

**Booking overlap response example:**
```json
409 Conflict
{
  "success": false,
  "error": {
    "code": "BOOKING_OVERLAP",
    "message": "Room B2 is already booked from 09:00 to 10:00, which overlaps your requested slot."
  }
}
```

---

## 6. Maintenance Module (`/maintenance`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/maintenance` | Scoped | Filter by asset, status, priority. |
| POST | `/maintenance` | All authenticated (typically current holder) | `{ assetId, issueDescription, priority, photoUrl? }`. Status starts `PENDING`. |
| POST | `/maintenance/:id/approve` | Asset Manager | Side effect: `asset.status = UNDER_MAINTENANCE` (same transaction). |
| POST | `/maintenance/:id/reject` | Asset Manager | `{ reason }`. No asset status change. |
| POST | `/maintenance/:id/assign-technician` | Asset Manager | `{ technicianName }`. Status → `TECHNICIAN_ASSIGNED`. |
| POST | `/maintenance/:id/start` | Asset Manager | Status → `IN_PROGRESS`. |
| POST | `/maintenance/:id/resolve` | Asset Manager | Side effect: `asset.status = AVAILABLE`, `resolved_at = now()` (same transaction). |

---

## 7. Audit Module (`/audits`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/audits` | Admin, Asset Manager | `{ scopeDepartmentId?, scopeLocation?, startDate, endDate, auditorIds: [...] }` — creates cycle + assignments + one `PENDING` `audit_result` row per in-scope asset (server computes scope at creation time and snapshots the asset list). |
| GET | `/audits` | Scoped | List cycles. |
| GET | `/audits/:id` | Scoped | Detail incl. progress (`verified/missing/damaged/pending` counts). |
| GET | `/audits/:id/results` | Assigned auditor, Admin, Asset Manager | List of asset-level results for the cycle. |
| PATCH | `/audits/:id/results/:assetId` | Assigned auditor for this cycle only | `{ result: "VERIFIED"\|"MISSING"\|"DAMAGED", notes? }`. Blocked by DB trigger if cycle is closed. |
| GET | `/audits/:id/discrepancy-report` | Admin, Asset Manager | All non-`VERIFIED` results, formatted for export. |
| POST | `/audits/:id/close` | Admin, Asset Manager | Executes Spec 01 §7 closure transaction. Idempotent — returns `409` if already closed. |

---

## 8. Dashboard & Reports Module (`/dashboard`, `/reports`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/dashboard/kpis` | All authenticated (scoped by role) | `{ assetsAvailable, assetsAllocated, maintenanceToday, activeBookings, pendingTransfers, upcomingReturns, overdueReturns }`. Each computed as its own scoped query, not derived client-side. |
| GET | `/reports/utilization` | Admin, Asset Manager | Most-used vs idle assets over a date range. |
| GET | `/reports/maintenance-frequency` | Admin, Asset Manager | Grouped by asset/category. |
| GET | `/reports/upcoming-lifecycle` | Admin, Asset Manager | Assets due for maintenance / nearing retirement (age/condition threshold). |
| GET | `/reports/department-allocation-summary` | Admin, Department Head (own dept) | Counts + value by department. |
| GET | `/reports/booking-heatmap` | Admin, Asset Manager | Aggregated booking density by hour/day. |
| GET | `/reports/:reportName/export?format=csv\|pdf` | Same as underlying report | Streams file. |

---

## 9. Notifications & Activity Log (`/notifications`, `/activity-log`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/notifications` | Self | `?unreadOnly=true`. |
| PATCH | `/notifications/:id/read` | Self | Marks read. |
| PATCH | `/notifications/read-all` | Self | Bulk mark read. |
| GET | `/activity-log` | Admin (all), Asset Manager/Dept Head (scoped), Employee (own actions only) | Filter by entity type/id, actor, date range. |

---

## 10. Cross-cutting: Rate Limiting

| Endpoint group | Limit |
|---|---|
| `/auth/login` | 5 attempts / 15 min per IP+email combo, exponential backoff after |
| `/auth/forgot-password` | 3 requests / hour per email |
| All other endpoints | Standard per-user throttle (e.g. 100 req/min) to prevent scripReact abuse |

---

## 11. Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed schema validation |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Valid token, insufficient role/scope |
| `NOT_FOUND` | 404 | Entity doesn't exist or isn't visible to caller |
| `ALLOCATION_CONFLICT` | 409 | Asset already actively allocated |
| `BOOKING_OVERLAP` | 409 | Time slot collides with existing booking |
| `INVALID_STATE_TRANSITION` | 409 | Requested status change isn't allowed from current state |
| `AUDIT_CYCLE_CLOSED` | 409 | Attempted edit on a closed cycle |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

This error-code vocabulary should be treated as the canonical list; frontend error handling and any AI agent building against this API should switch on `error.code`, not on parsing `error.message` strings.
