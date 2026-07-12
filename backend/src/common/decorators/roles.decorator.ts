import { SetMetadata } from '@nestjs/common';

/**
 * Roles allowed for an endpoint.
 * Used by RolesGuard to check if the current user has the required role.
 *
 * Usage:
 *   @Roles('ADMIN', 'ASSET_MANAGER')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
