import { ApiError } from '../../common/exceptions/api-error.exception';

export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

export interface Transition {
  from: AssetStatus;
  to: AssetStatus;
  triggeredBy: string;
  allowedRoles: string[];
}

export const ASSET_TRANSITIONS: Transition[] = [
  {
    from: 'AVAILABLE',
    to: 'ALLOCATED',
    triggeredBy: 'allocation.create',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'],
  },
  {
    from: 'AVAILABLE',
    to: 'RESERVED',
    triggeredBy: 'booking.create',
    allowedRoles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },
  {
    from: 'AVAILABLE',
    to: 'UNDER_MAINTENANCE',
    triggeredBy: 'maintenance.approve',
    allowedRoles: ['ASSET_MANAGER'],
  },
  {
    from: 'ALLOCATED',
    to: 'AVAILABLE',
    triggeredBy: 'allocation.return',
    allowedRoles: [
      'ADMIN',
      'ASSET_MANAGER',
      'HOLDER_OR_OWNER_RESOLVED_AT_RUNTIME',
    ],
  },
  {
    from: 'ALLOCATED',
    to: 'UNDER_MAINTENANCE',
    triggeredBy: 'maintenance.approve',
    allowedRoles: ['ASSET_MANAGER'],
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
    allowedRoles: [
      'ADMIN',
      'ASSET_MANAGER',
      'HOLDER_OR_OWNER_RESOLVED_AT_RUNTIME',
    ],
  },
  {
    from: 'UNDER_MAINTENANCE',
    to: 'AVAILABLE',
    triggeredBy: 'maintenance.resolve',
    allowedRoles: ['ASSET_MANAGER'],
  },
  {
    from: 'UNDER_MAINTENANCE',
    to: 'LOST',
    triggeredBy: 'audit.close.confirmedMissing',
    allowedRoles: ['SYSTEM'],
  },
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

export function assertValidTransition(
  currentStatus: AssetStatus,
  targetStatus: AssetStatus,
  event: string,
  actorRole: string,
) {
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
      `Cannot move asset from ${currentStatus} to ${targetStatus} via ${event}`,
    );
  }
  if (
    !match.allowedRoles.includes(actorRole) &&
    !match.allowedRoles.includes('HOLDER_OR_OWNER_RESOLVED_AT_RUNTIME')
  ) {
    throw new ApiError(
      'FORBIDDEN',
      403,
      `Role ${actorRole} cannot perform ${event}`,
    );
  }
}
