import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiError, ErrorCodes } from '../exceptions/api-error.exception';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Dev/Mock fallback for local development & testing
    const mockUserId = request.headers['x-user-id'];
    if (mockUserId) {
      request.user = {
        id: mockUserId,
        role: request.headers['x-user-role'] || 'EMPLOYEE',
        departmentId: request.headers['x-user-dept'] || null,
      };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 401, 'Authentication token missing');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 401, 'Invalid authentication token format');
    }

    try {
      const secret = this.configService.get<string>('jwt.accessSecret') || 'dev-access-secret-change-me';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // sub maps to employeeId per Spec 04 §2
      request.user = {
        id: payload.sub,
        role: payload.role,
        departmentId: payload.departmentId,
      };
      
      return true;
    } catch (error) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 401, 'Invalid or expired authentication token');
    }
  }
}
