import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Auth repository — database operations for authentication.
 * Handles employee lookups, refresh token storage, and password reset tokens.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findEmployeeByEmail(email: string) {
    // TODO: Implement
    return null;
  }

  async findEmployeeById(id: string) {
    // TODO: Implement
    return null;
  }

  async createEmployee(data: { name: string; email: string; passwordHash: string }) {
    // TODO: Implement — role is always 'EMPLOYEE', never passed as parameter
    return null;
  }

  async storeRefreshToken(employeeId: string, tokenHash: string, expiresAt: Date) {
    // TODO: Implement
  }

  async findRefreshToken(tokenHash: string) {
    // TODO: Implement
    return null;
  }

  async revokeRefreshToken(tokenId: string) {
    // TODO: Implement
  }

  async revokeAllRefreshTokens(employeeId: string) {
    // TODO: Implement
  }
}
