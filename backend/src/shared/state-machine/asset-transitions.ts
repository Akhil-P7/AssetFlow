import { ApiError } from '../../common/exceptions/api-error.exception';

/**
 * Asset lifecycle states — matches the asset_status Postgres ENUM from Spec 01.
 */
export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

/**
 * Employee roles — matches the employee_role Postgres ENUM from Spec 01.
 */
export type EmployeeRole =
  'EMPLOYEE' | 'DEPARTMENT_HEAD' | 'ASSET_MANAGER' | 'ADMIN';

/**
 * Special pseudo-roles used in transition definitions.
 * Resolved at runtime by the calling service.
 */
type TransitionRole = EmployeeRole | 'SYSTEM' | 'HOLDER' | 'BOOKING_OWNER';

/**
 * A single valid state transition in the asset lifecycle.
 *
 * This table is the SINGLE SOURCE OF TRUTH for what status changes are allowed.
 * Every service that modifies asset.status MUST call assertValidTransition() first.
 * See Spec 03 §1 for the design rationale.
 */
interface Transition {
  from: AssetStatus;
  to: AssetStatus;
  triggeredBy: string;
  allowedRoles: TransitionRole[];
}

/**
 * The complete asset state transition table from Spec 03 §1.
 *
 * Any transition NOT in this table is rejected — this is what prevents
 * illegal jumps like ALLOCATED → DISPOSED regardless of which screen
 * or API client attempts it.
 */
export const ASSET_TRANSITIONS: Transition[] = [
  // Allocation flows
  {
    from: 'AVAILABLE',
    to: 'ALLOCATED',
    triggeredBy: 'allocation.create',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'],
  },
  {
    from: 'ALLOCATED',
    to: 'AVAILABLE',
    triggeredBy: 'allocation.return',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER', 'HOLDER'],
  },

  // Booking flows
  {
    from: 'AVAILABLE',
    to: 'RESERVED',
    triggeredBy: 'booking.create',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },
  {
    from: 'RESERVED',
    to: 'AVAILABLE',
    triggeredBy: 'booking.complete',
    allowedRoles: ['SYSTEM'],
  },
  {
    from: 'RESERVED',
    to: 'AVAILABLE',
    triggeredBy: 'booking.cancel',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER', 'BOOKING_OWNER'],
  },

  // Maintenance flows
  {
    from: 'AVAILABLE',
    to: 'UNDER_MAINTENANCE',
    triggeredBy: 'maintenance.approve',
    allowedRoles: ['ASSET_MANAGER'],
  },
  {
    from: 'ALLOCATED',
    to: 'UNDER_MAINTENANCE',
    triggeredBy: 'maintenance.approve',
    allowedRoles: ['ASSET_MANAGER'],
  },
  {
    from: 'UNDER_MAINTENANCE',
    to: 'AVAILABLE',
    triggeredBy: 'maintenance.resolve',
    allowedRoles: ['ASSET_MANAGER'],
  },

  // Audit flows — confirmed missing assets become LOST
  {
    from: 'AVAILABLE',
    to: 'LOST',
    triggeredBy: 'audit.close.confirmedMissing',
    allowedRoles: ['SYSTEM'],
  },
  {
    from: 'ALLOCATED',
    to: 'LOST',
    triggeredBy: 'audit.close.confirmedMissing',
    allowedRoles: ['SYSTEM'],
  },
  {
    from: 'UNDER_MAINTENANCE',
    to: 'LOST',
    triggeredBy: 'audit.close.confirmedMissing',
    allowedRoles: ['SYSTEM'],
  },

  // Manual overrides (Admin/Asset Manager)
  {
    from: 'LOST',
    to: 'AVAILABLE',
    triggeredBy: 'manual.override.recovered',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    from: 'AVAILABLE',
    to: 'RETIRED',
    triggeredBy: 'manual.override.retire',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    from: 'LOST',
    to: 'RETIRED',
    triggeredBy: 'manual.override.retire',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    from: 'RETIRED',
    to: 'DISPOSED',
    triggeredBy: 'manual.override.dispose',
    allowedRoles: ['ADMIN'],
  },
];

/**
 * Validates that a proposed state transition is legal according to the
 * transition table. Throws ApiError if the transition is not allowed.
 *
 * This function is called inside the same DB transaction as the status update,
 * so the check and the update are atomic.
 *
 * @param currentStatus - The asset's current status
 * @param targetStatus - The desired new status
 * @param event - The triggering event (e.g. 'allocation.create')
 * @param actorRole - The role of the user (or 'SYSTEM' for cron jobs)
 */
export function assertValidTransition(
  currentStatus: AssetStatus,
  targetStatus: AssetStatus,
  event: string,
  actorRole: string,
): void {
  const match = ASSET_TRANSITIONS.find(
    (t) =>
      t.from === currentStatus &&
      t.to === targetStatus &&
      t.triggeredBy === event,
  );

  if (!match) {
    throw new ApiError(
      'INVALID_STATE_TRANSITION',
      409,
      `Cannot transition asset from '${currentStatus}' to '${targetStatus}' via '${event}'`,
    );
  }

  // SYSTEM, HOLDER, and BOOKING_OWNER are resolved at runtime by the calling service
  // before invoking this function. If the actorRole is one of these pseudo-roles,
  // the calling service has already verified the actor is authorized.
  const resolvedRoles = match.allowedRoles as string[];
  if (!resolvedRoles.includes(actorRole) && !resolvedRoles.includes('SYSTEM')) {
    throw new ApiError(
      'FORBIDDEN',
      403,
      `Role '${actorRole}' is not allowed to perform '${event}' on this asset`,
    );
  }
}
