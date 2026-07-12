import { Injectable, Logger } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './auth.dto';

/**
 * Auth service — business logic for authentication workflows.
 *
 * Key design decisions (Spec 04):
 * - signup() hard-codes role='EMPLOYEE' — no role parameter accepted at all
 * - Passwords hashed with argon2id
 * - Access tokens: JWT, 15min TTL
 * - Refresh tokens: opaque, stored hashed in DB, rotated on use
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly authRepository: AuthRepository) {}

  async signup(dto: SignupDto) {
    // TODO: Implement — hash password, create employee with role='EMPLOYEE', return user
    this.logger.log(`Signup attempt for: ${dto.email}`);
    throw new Error('Not implemented');
  }

  async login(dto: LoginDto) {
    // TODO: Implement — verify credentials, generate access + refresh tokens
    this.logger.log(`Login attempt for: ${dto.email}`);
    throw new Error('Not implemented');
  }

  async refreshToken(dto: RefreshTokenDto) {
    // TODO: Implement — validate refresh token, rotate, issue new access token
    throw new Error('Not implemented');
  }

  async logout(dto: RefreshTokenDto) {
    // TODO: Implement — revoke refresh token
    throw new Error('Not implemented');
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // TODO: Implement — generate reset token, send email
    // Always return success regardless of whether email exists (prevent enumeration)
    throw new Error('Not implemented');
  }

  async resetPassword(dto: ResetPasswordDto) {
    // TODO: Implement — validate reset token, update password, revoke all sessions
    throw new Error('Not implemented');
  }

  async getProfile(userId: string) {
    // TODO: Implement — return user with role + department info
    throw new Error('Not implemented');
  }
}
