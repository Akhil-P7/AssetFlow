import { SetMetadata } from '@nestjs/common';

/**
 * Marks an endpoint as requiring role re-fetch from the DB.
 * Used for write/state-changing operations per Spec 04 §2:
 * - Read endpoints trust JWT claims (fast path)
 * - Write endpoints re-verify role from DB (closes the "demoted mid-session" gap)
 *
 * Usage:
 *   @RefetchRole()
 *   @Roles('ADMIN')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   async promote() { ... }
 */
export const REFETCH_ROLE_KEY = 'refetchRole';
export const RefetchRole = () => SetMetadata(REFETCH_ROLE_KEY, true);
