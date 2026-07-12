import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the current authenticated user from the request.
 * Populated by JwtAuthGuard after token verification.
 *
 * Usage:
 *   @Get()
 *   getProfile(@CurrentUser() user: JwtPayload) { ... }
 *
 *   @Get()
 *   getId(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
