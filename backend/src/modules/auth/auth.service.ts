import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto } from './auth.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

/**
 * Auth service — business logic for authentication workflows.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    this.logger.log(`Signup attempt for: ${dto.email}`);
    const existing = await this.authRepository.findEmployeeByEmail(dto.email);
    if (existing) {
      throw new UnauthorizedException('Email already in use');
    }
    const passwordHash = await argon2.hash(dto.password);
    const employee = await this.authRepository.createEmployee({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = employee;
    return { success: true, data: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    this.logger.log(`Login attempt for: ${dto.email}`);
    const employee = await this.authRepository.findEmployeeByEmail(dto.email);
    if (!employee || employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(employee.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(employee);
  }

  async refreshToken(dto: RefreshTokenDto) {
    const hashedDtoToken = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenRecord = await this.authRepository.findRefreshToken(hashedDtoToken);

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const employee = await this.authRepository.findEmployeeById(tokenRecord.employeeId);
    if (!employee || employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid user');
    }

    // Rotate token
    await this.authRepository.revokeRefreshToken(tokenRecord.id);
    return this.generateTokens(employee);
  }

  async logout(dto: RefreshTokenDto) {
    const hashedDtoToken = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenRecord = await this.authRepository.findRefreshToken(hashedDtoToken);
    
    if (tokenRecord) {
      await this.authRepository.revokeRefreshToken(tokenRecord.id);
    }
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Always return success regardless of whether email exists (prevent enumeration)
    return { success: true, message: 'If that email exists, a reset link was sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // TODO: Full implementation involves sending/verifying reset token. For this mock just return success.
    return { success: true };
  }

  async getProfile(userId: string) {
    const employee = await this.authRepository.findEmployeeById(userId);
    if (!employee) {
      throw new UnauthorizedException('User not found');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...user } = employee;
    return { success: true, data: user };
  }

  private async generateTokens(employee: any) {
    const payload = {
      sub: employee.id,
      role: employee.role,
      departmentId: employee.departmentId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    
    // Generate opaque refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL

    await this.authRepository.storeRefreshToken(employee.id, hashedRefreshToken, expiresAt);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...user } = employee;

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user,
      }
    };
  }
}
