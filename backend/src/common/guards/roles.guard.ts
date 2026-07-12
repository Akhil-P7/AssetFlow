import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REFETCH_ROLE_KEY } from '../decorators/refetch-role.decorator';
import { ApiError } from '../exceptions/api-error.exception';

/**
 * Guard that enforces role-based access control (RBAC).
 *
 * Behavior per Spec 04 §2:
 * - By default, trusts the JWT's `role` claim (fast path for read endpoints)
 * - When @RefetchRole() is applied, re-fetches role & status from the DB
 *   (closes the "demoted mid-session" gap for write/state-changing endpoints)
 *
 * Usage:
 *   @Roles('ADMIN', 'ASSET_MANAGER')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator = endpoint is open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ApiError('UNAUTHORIZED', 401, 'Authentication required');
    }

    const shouldRefetch = this.reflector.getAllAndOverride<boolean>(
      REFETCH_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    let role = user.role;
    let status = 'ACTIVE';

    if (shouldRefetch) {
      const result = await this.dataSource.query(
        `SELECT role, status FROM employee WHERE id = $1`,
        [user.id],
      );

      if (!result || result.length === 0) {
        throw new ApiError('UNAUTHORIZED', 401, 'User not found');
      }

      role = result[0].role;
      status = result[0].status;

      // Update the request user with fresh data
      request.user.role = role;
    }

    if (status !== 'ACTIVE') {
      throw new ApiError('UNAUTHORIZED', 401, 'Account deactivated');
    }

    if (!requiredRoles.includes(role)) {
      this.logger.warn(
        `Role ${role} denied access to ${request.method} ${request.url} (requires: ${requiredRoles.join(', ')})`,
      );
      throw new ApiError(
        'FORBIDDEN',
        403,
        `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
