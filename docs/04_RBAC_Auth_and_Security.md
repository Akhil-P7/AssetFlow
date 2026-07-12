# AssetFlow — Technical Spec 04: RBAC, Authentication & Security Implementation

**Purpose:** Turns the permission matrix from the master plan into concrete auth mechanics, guard implementation, and hardening measures.

---

## 1. Password & Credential Handling

- Hash with **argon2id** (preferred) or bcrypt (cost factor ≥ 12) — never store plaintext or reversible encryption.
- Password policy enforced at signup/reset: minimum 8 characters, at least one number — kept simple and not overly restrictive (the problem statement doesn't ask for enterprise password complexity theater; excessive rules would be scope creep).
- On `reset-password`, invalidate all existing refresh tokens for that user (force re-login everywhere) — prevents a compromised session from surviving a password change.

---

## 2. Token Strategy

- **Access token**: JWT, short-lived (15 min), payload contains `{ sub: employeeId, role, departmentId, iat, exp }`.
- **Refresh token**: opaque random string, stored hashed in a `refresh_token` table (not JWT — allows server-side revocation), long-lived (7 days), rotated on every use (old one invalidated when a new one is issued — detects token theft via reuse detection).

```sql
CREATE TABLE refresh_token (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employee(id),
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Critical implementation detail — why role lives in the JWT but is still re-verified:** the JWT's `role` claim is convenient for fast in-memory checks, but because a token is valid for up to 15 minutes, a role change (promotion/demotion) during that window shouldn't grant/deny access based on stale claims for sensitive write operations. Pattern:
- **Read-only / low-risk endpoints:** trust the JWT claim (`role`) directly — fast path.
- **Write / state-changing endpoints (allocate, approve, promote, close audit, etc.):** the guard re-fetches `employee.role` and `employee.status` from the DB before executing the action. This costs one extra query per write but closes the "demoted mid-session" gap for anything that actually matters.

```typescript
async function requireRole(allowedRoles: Role[], refetch = false) {
  return async (req, res, next) => {
    const claims = verifyJwt(req.headers.authorization);
    let role = claims.role;
    let status = 'ACTIVE';
    if (refetch) {
      const emp = await db.query(`SELECT role, status FROM employee WHERE id=$1`, [claims.sub]);
      role = emp.rows[0].role;
      status = emp.rows[0].status;
    }
    if (status !== 'ACTIVE') throw new ApiError('UNAUTHORIZED', 401, 'Account deactivated');
    if (!allowedRoles.includes(role)) throw new ApiError('FORBIDDEN', 403, 'Insufficient role');
    req.actor = { id: claims.sub, role, departmentId: claims.departmentId };
    next();
  };
}
```

---

## 3. Signup Hardening (the "no self-elevation" guarantee, end-to-end)

Three independent layers, so a bug in any single layer doesn't break the guarantee:

1. **DTO/schema layer:** the request validation schema for `POST /auth/signup` has no `role` property defined at all. Extra fields are stripped (`whitelist: true, forbidNonWhitelisted: false` in class-validator terms, or equivalent) — even if a malicious client sends `"role": "ADMIN"` in the JSON body, it never reaches the service function's parameters.
2. **Service layer:** `createEmployee()` (the signup service function) has no `role` parameter in its signature at all — it's hard-coded to `EMPLOYEE` inside the function, not passed in.
3. **DB layer:** `employee.role` has `DEFAULT 'EMPLOYEE'` — even a direct INSERT that omits the column lands on Employee, not an undefined/null state.

The **only** code path capable of writing a non-Employee role is `PATCH /org/employees/:id/promote`, gated by `requireRole(['ADMIN'], refetch=true)`.

---

## 4. Full Permission Matrix → Guard Mapping

| Endpoint | Guard |
|---|---|
| `POST /org/departments` | `requireRole(['ADMIN'])` |
| `POST /org/employees/:id/promote` | `requireRole(['ADMIN'], refetch=true)` |
| `POST /assets` | `requireRole(['ADMIN','ASSET_MANAGER'])` |
| `POST /allocations` | `requireRole(['ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD'])` + scope check: if Dept Head, target department must equal `actor.departmentId` |
| `POST /transfers/:id/approve` | `requireRole(['ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD'], refetch=true)` + scope check on the transfer's department |
| `POST /bookings` | `requireRole(['ADMIN','ASSET_MANAGER','DEPARTMENT_HEAD','EMPLOYEE'])` (i.e., any authenticated user) |
| `POST /maintenance` | any authenticated user |
| `POST /maintenance/:id/approve` | `requireRole(['ASSET_MANAGER'], refetch=true)` |
| `POST /audits` | `requireRole(['ADMIN','ASSET_MANAGER'])` |
| `PATCH /audits/:id/results/:assetId` | `requireRole(['ADMIN','ASSET_MANAGER'])` **+** membership check against `audit_assignment` for that cycle |
| `GET /reports/*` | `requireRole(['ADMIN','ASSET_MANAGER'])`, department-summary additionally allows `DEPARTMENT_HEAD` scoped to own dept |
| `GET /activity-log` | all roles, but query is passed through `scopeActivityLogQuery(actor)` (Employee sees only `actor_id = self`) |

**Ownership/scope checks are a second guard layer beyond role**, since role alone doesn't capture "Department Head of *this* department" or "auditor assigned to *this* cycle." Implement these as small composable middleware functions (`requireDepartmentScope`, `requireAuditorAssignment`) rather than inlining checks in every controller, so they can be unit-tested once and reused.

---

## 5. Input Validation & Injection Prevention

- All DB access via parameterized queries / query builder or ORM — **never string-concatenated SQL**, anywhere, including report filters.
- Request body validation via schema (Zod/Joi/class-validator or equivalent) on every endpoint before it reaches business logic — rejects unexpected fields, wrong types, out-of-range values (e.g., `endDate < startDate` on audit cycle creation).
- File uploads (asset photos, maintenance photos, documents): validate MIME type and file size server-side (not just `accept=` in the HTML input, which is trivially bypassed), store in object storage with a generated filename (never trust the client-provided filename for the storage key, to prevent path traversal).

---

## 6. Rate Limiting & Abuse Prevention

| Surface | Limit | Rationale |
|---|---|---|
| `POST /auth/login` | 5/15min per (IP, email) pair | Brute-force protection |
| `POST /auth/forgot-password` | 3/hour per email | Prevents email-bombing / enumeration |
| `POST /auth/signup` | 10/hour per IP | Prevents automated account farming |
| Authenticated general API | 100 req/min per user | Prevents runaway scripts/bugs from hammering the DB |

Return `429` with a `Retry-After` header on limit breach; log repeated breaches to `activity_log` with `actor_id = null` and metadata capturing IP for later review.

---

## 7. Transport & Data-at-Rest

- HTTPS/TLS everywhere (terminate at load balancer/reverse proxy in deployment).
- Environment secrets (DB credentials, JWT signing key, object storage keys) via environment variables / secrets manager — never committed to the repo.
- JWT signing key: minimum 256-bit random secret (HS256) or asymmetric keypair (RS256) if multiple services need to verify tokens independently.

---

## 8. Audit Trail Integrity (security-relevant, not just operational)

- `activity_log` table has no `UPDATE`/`DELETE` grant for the application's DB role — enforced at the DB user-privilege level, not just "we don't call those methods in code." This means even a compromised application server can't rewrite history.
- Every guard failure (`403`) and every role-promotion action is itself logged, giving a forensic trail of both successful and attempted privilege use.

---

## 9. Session/Account Lifecycle Edge Cases

| Scenario | Behavior |
|---|---|
| Employee deactivated (`status='INACTIVE'`) while holding a valid access token | Next write request re-fetches status via `refetch=true` guard → `401`; read-only requests may succeed until token expiry (max 15 min exposure window) |
| Department Head demoted back to Employee | Same mechanism — write endpoints catch it within the token's short TTL |
| Password reset requested for non-existent email | API returns a generic success response regardless (`"If that email exists, a reset link was sent"`) to avoid user-enumeration via response differences |
| Refresh token reused after rotation (theft indicator) | All refresh tokens for that employee are revoked immediately, forcing full re-login everywhere |
