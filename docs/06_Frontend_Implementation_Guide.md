# AssetFlow — Technical Spec 06: Frontend Implementation Guide

**Purpose:** Screen-by-screen component breakdown, role-based UI rules, state management patterns, and design system specifications for the React/TypeScript frontend. References the wireframe mockups and maps every UI element to its backend API endpoint.

---

## 1. Design System

### 1.1 Color Palette (Dark Theme)

The application uses a **dark-first design** with the following base palette:

| Token | Hex | Usage |
|---|---|---|
| `--bg-primary` | `#0f0f1a` | Page background |
| `--bg-secondary` | `#1a1a2e` | Sidebar, cards |
| `--bg-tertiary` | `#16213e` | Elevated surfaces, modals |
| `--bg-input` | `#0f3460` | Input fields |
| `--text-primary` | `#e0e0e0` | Primary text |
| `--text-secondary` | `#a0a0a0` | Secondary/muted text |
| `--text-heading` | `#ffffff` | Headings |
| `--accent-green` | `#00c853` | Primary actions, success states, Active/Verified badges |
| `--accent-red` | `#ff4444` | Destructive actions, error states, Missing/Inactive badges |
| `--accent-amber` | `#ffab00` | Warning states, Damaged badges |
| `--accent-blue` | `#2196f3` | Links, selected sidebar items |
| `--accent-teal` | `#00bcd4` | KPI card accents |
| `--border` | `#2a2a3e` | Card/table borders |

### 1.2 Typography

- **Font**: `Inter` (Google Fonts) — clean, modern, highly legible at small sizes
- **Headings**: `Inter 600` (semi-bold)
- **Body**: `Inter 400` (regular)
- **Monospace** (asset tags, codes): `JetBrains Mono` or `Fira Code`

### 1.3 Spacing & Layout

- Sidebar width: `240px` (fixed)
- Content area: fluid, with `max-width: 1200px` and `padding: 24px`
- Card padding: `16px–20px`
- Border radius: `8px` (cards), `6px` (buttons/inputs), `12px` (badges)

---

## 2. Layout Architecture

### 2.1 App Shell

Every authenticated screen shares the same shell:

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (fixed left)  │  Content Area (scrollable)   │
│                       │                              │
│ ┌─────────────────┐   │  ┌────────────────────────┐  │
│ │ AssetFlow (logo)│   │  │  Page Header           │  │
│ │                 │   │  │  (title + actions)      │  │
│ │ Dashboard       │   │  ├────────────────────────┤  │
│ │ Organization    │   │  │                        │  │
│ │ Assets          │   │  │  Page Content           │  │
│ │ Allocation &    │   │  │                        │  │
│ │   Transfer      │   │  │                        │  │
│ │ Resource        │   │  │                        │  │
│ │   Booking       │   │  │                        │  │
│ │ Maintenance     │   │  │                        │  │
│ │ Audit           │   │  │                        │  │
│ │ Reports         │   │  │                        │  │
│ │ Notifications   │   │  │                        │  │
│ └─────────────────┘   │  └────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- Sidebar has a **highlighted active item** (filled background, accent color)
- Navigation items are conditionally shown based on user role (UI-only — backend enforces the real access)
- User name displayed at bottom of sidebar with role badge

### 2.2 Sidebar Navigation Items

| Label | Route | Visible To |
|---|---|---|
| Dashboard | `/dashboard` | All roles |
| Organization Setup | `/org` | Admin |
| Assets | `/assets` | All roles |
| Allocation & Transfer | `/allocations` | All roles |
| Resource Booking | `/bookings` | All roles |
| Maintenance | `/maintenance` | All roles |
| Audit | `/audits` | Admin, Asset Manager |
| Reports | `/reports` | Admin, Asset Manager, Dept Head (scoped) |
| Notifications | `/notifications` | All roles |

---

## 3. Screen-by-Screen Breakdown

### Screen 1: Authentication (Login / Signup / Forgot Password)

**Route:** `/login`, `/signup`, `/forgot-password`

**Layout:** Centered card on dark background, NO sidebar (unauthenticated).

**Components:**
- `LoginForm` — Email input, password input, "Forgot password" link, Login button
- `SignupForm` — Name, email, password inputs, info notice: "Sign up creates an employee account. Admin roles assigned later." , "Create Account" button
- `ForgotPasswordForm` — Email input, submit button

**API Calls:**
- `POST /auth/login` → store tokens, redirect to `/dashboard`
- `POST /auth/signup` → show success, redirect to `/login`
- `POST /auth/forgot-password` → show generic success message

**Key UX Detail (from mockup):** The signup form shows a clear notice that the account starts as Employee — this matches the no-self-elevation guarantee.

---

### Screen 2: Dashboard

**Route:** `/dashboard`

**Components:**
- `KPICardGrid` — 6 cards in 2 rows of 3:
  - Row 1: Available (count), Allocated (count), Available (separate metric)
  - Row 2: Active Bookings, Pending Transfers, Upcoming Returns
- `OverdueBar` — Red/green progress bar showing overdue vs. on-time returns
- `UserGreeting` — "Welcome, [Name]" with user avatar/icon
- `QuickActions` — 3 buttons: "+ Register Asset", "Book Resource", "Raise Request"
- `RecentActivity` — Last 5-10 activity log entries (compact list)

**API Calls:**
- `GET /dashboard/kpis` → populates all KPI cards (role-scoped server-side)
- `GET /activity-log?limit=10` → populates recent activity

**Role Behavior:**
- Admin/Asset Manager: sees org-wide KPIs
- Dept Head: sees department-scoped KPIs
- Employee: sees only their own allocations/bookings

---

### Screen 3: Organization Setup (Admin-only)

**Route:** `/org`

**Layout:** Three horizontal tabs: **Departments | Categories | Employees** + "+ Add" button

**Components:**
- `TabBar` with 3 tabs
- `DepartmentsTab`:
  - `DataTable` with columns: Department, Head, Parent Dept, Status
  - Status shown as colored badge (green Active, red Inactive)
  - Inline edit or modal for create/edit
- `CategoriesTab`:
  - `DataTable` with columns: Name, Custom Fields count, Status
  - Modal for creating with dynamic custom field builder
- `EmployeesTab`:
  - `DataTable` with columns: Name, Email, Department, Role, Status
  - "Promote" action button (Admin-only) — triggers `/org/employees/:id/promote`

**API Calls:**
- `GET /org/departments`, `POST /org/departments`, `PATCH /org/departments/:id`
- `GET /org/categories`, `POST /org/categories`, `PATCH /org/categories/:id`
- `GET /org/employees`, `POST /org/employees/:id/promote`

---

### Screen 4: Asset Registration & Directory

**Route:** `/assets`

**Components:**
- `SearchBar` — "Search by tag, serial, or QR code..." with full-text search
- `FilterPills` — Category, Status, Department dropdowns
- `RegisterAssetButton` — "+ Register Asset" (opens modal/form)
- `AssetTable` — columns: Tag, Name, Category, Status, Location
  - Tag displayed in monospace font
  - Status as colored badge
  - Clickable rows → asset detail page
- `RegisterAssetModal/Form` — Name, Category (dropdown), Serial Number, Acquisition Date, Cost, Condition, Location, is_bookable checkbox, photos upload

**API Calls:**
- `GET /assets?q=&category=&status=&department=` → search/filter
- `POST /assets` → register new asset
- `GET /assets/:id` → asset detail

---

### Screen 5: Asset Allocation & Transfer

**Route:** `/allocations`

**Components:**
- `AssetSelector` — Search and select an asset (shows tag + name)
- `AllocationStatus` — Shows current allocation state:
  - If available: allocation form (employee/dept dropdown, expected return date)
  - If already allocated: **conflict banner** — "Already allocated to [Name] (Department). Direct allocation is blocked — submit a Transfer request below"
- `TransferRequestForm` — From (pre-filled), To (employee dropdown), Reason textarea, "Submit Request" button (green)
- `AllocationHistory` — Timeline/list of past allocations for the selected asset

**API Calls:**
- `POST /allocations` → attempt allocation, handle `409 ALLOCATION_CONFLICT`
- `POST /transfers` → create transfer request
- `GET /allocations?assetId=` → history
- `GET /transfers` → pending transfers list

**Key UX (from mockup):** The conflict banner is shown inline with a red/warning style, and the transfer form appears below it — this is the direct visual representation of the 409 conflict response.

---

### Screen 6: Resource Booking

**Route:** `/bookings`

**Components:**
- `ResourceSelector` — Dropdown to pick a bookable resource
- `CalendarView` — Vertical timeline showing hourly slots (9:00–17:00)
  - Booked slots shown as filled blocks with booking info
  - Conflicting/rejected slots shown with dotted red borders
  - Available slots are empty/clickable
- `BookSlotButton` — "Book a slot" (green) → opens booking form
- `BookingForm` — Start time, end time, optional department

**API Calls:**
- `GET /bookings/resource/:assetId/calendar?date=` → calendar data
- `POST /bookings` → create booking, handle `409 BOOKING_OVERLAP`
- `POST /bookings/:id/cancel` → cancel booking

---

### Screen 7: Maintenance Management

**Route:** `/maintenance`

**Layout:** **Kanban board** with 5 columns

**Components:**
- `KanbanBoard` with columns:
  - **Pending** — newly raised requests
  - **Approved** — approved, awaiting technician
  - **Technician Assigned** — technician named
  - **In Progress** — work ongoing
  - **Resolved** — completed
- `MaintenanceCard` — Shows asset tag, brief description, priority badge
  - Cards can be dragged between columns (triggers the appropriate API endpoint)
  - Or: action buttons on each card for the next valid transition
- `RaiseRequestButton` — Opens form to create new maintenance request

**API Calls:**
- `GET /maintenance` → all requests grouped by status
- `POST /maintenance` → raise new request
- `POST /maintenance/:id/approve` → move to Approved
- `POST /maintenance/:id/assign-technician` → assign
- `POST /maintenance/:id/start` → move to In Progress
- `POST /maintenance/:id/resolve` → resolve

**Key UX (from mockup):** Bottom note explains: "Approving a card moves the asset to under maintenance, resolving returns it to available"

---

### Screen 8: Asset Audit

**Route:** `/audits`

**Components:**
- `AuditCycleHeader` — Shows cycle name, date range, assigned auditors
- `AuditChecklist` — Table with columns: Asset (tag), Expected Location, Verification
  - Verification column: dropdown or button group for `Verified | Missing | Damaged`
  - Color-coded: green Verified, red Missing, amber Damaged
- `DiscrepancyBanner` — "[N] assets flagged — discrepancy report generated automatically"
- `CloseAuditButton` — "Close audit cycle" (destructive action, confirmation modal)
- `CreateAuditForm` — Scope (department, location), date range, auditor selection

**API Calls:**
- `GET /audits` → list cycles
- `GET /audits/:id/results` → checklist data
- `PATCH /audits/:id/results/:assetId` → submit verification result
- `GET /audits/:id/discrepancy-report` → discrepancy data
- `POST /audits/:id/close` → close cycle

---

### Screen 9: Reports & Analytics

**Route:** `/reports`

**Components:**
- `UtilizationChart` — Bar chart: "Utilization by Department"
- `MaintenanceChart` — Line chart: "Maintenance Frequency"
- `MostUsedAssets` — Ranked list of most-used assets
- `IdleAssets` — List of idle/underused assets
- `LifecycleAlerts` — "Assets due for maintenance / nearing retirement"
- `ExportButton` — "Export report" (red/orange) → triggers CSV/PDF download

**API Calls:**
- `GET /reports/utilization` → bar chart data
- `GET /reports/maintenance-frequency` → line chart data
- `GET /reports/upcoming-lifecycle` → lifecycle alerts
- `GET /reports/department-allocation-summary` → department breakdown
- `GET /reports/:reportName/export?format=csv|pdf` → file download

**Charting Library:** Recharts (React-native, composable, works well with dark themes)

---

### Screen 10: Activity Logs & Notifications

**Route:** `/notifications`

**Layout:** Tab-based: **All | Alerts | Approvals | Bookings**

**Components:**
- `TabBar` — Filter tabs for notification types
- `NotificationList` — Chronological list with:
  - Icon per notification type
  - Description text
  - Relative timestamp ("2m ago", "1d ago", "5d ago")
  - Unread indicator (dot or highlight)
- `MarkAllReadButton` — Bulk mark-read action

**API Calls:**
- `GET /notifications?unreadOnly=true` → unread notifications
- `PATCH /notifications/:id/read` → mark individual as read
- `PATCH /notifications/read-all` → bulk mark read
- `GET /activity-log` → full activity log (separate sub-tab or view)

---

## 4. State Management Strategy

### Server State (React Query / TanStack Query)
All data from the API is managed via React Query:
- **Query keys** follow the pattern: `['assets']`, `['assets', assetId]`, `['dashboard-kpis']`, `['bookings', { resourceId, date }]`
- **Mutations** invalidate related queries automatically:
  - Allocating an asset → invalidate `['assets']`, `['dashboard-kpis']`, `['allocations']`
  - Approving maintenance → invalidate `['maintenance']`, `['assets']`, `['dashboard-kpis']`
  - Closing audit → invalidate `['audits']`, `['assets']`

### Client State (Local / Zustand)
- Form inputs, modal open/close, sidebar collapse state
- Current selected filters (category, status, department on asset list)
- Notification unread count (synced from React Query cache)

---

## 5. Error Handling Pattern

All API errors follow the backend's standard envelope. The frontend handles:

```typescript
switch (error.code) {
  case 'ALLOCATION_CONFLICT':
    // Show conflict banner with current holder info
    break;
  case 'BOOKING_OVERLAP':
    // Show overlap error with conflicting booking details
    break;
  case 'INVALID_STATE_TRANSITION':
    // Show toast: "This action is not allowed in the current state"
    break;
  case 'FORBIDDEN':
    // Show toast: "You don't have permission for this action"
    break;
  case 'VALIDATION_ERROR':
    // Map field-level errors to form inputs
    break;
}
```

---

## 6. Responsive Strategy

- **Desktop** (≥1024px): Full sidebar + content area
- **Tablet** (768–1023px): Collapsible sidebar (hamburger toggle)
- **Mobile** (≤767px): Bottom navigation bar replaces sidebar, simplified table views (card layout on small screens)

All tables switch to a **stacked card layout** on mobile, with each row becoming a card showing the most important 3-4 fields.
