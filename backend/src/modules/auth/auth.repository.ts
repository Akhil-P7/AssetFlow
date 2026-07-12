import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Employee } from '../org/employees/employee.entity';
import { RefreshToken } from './refresh-token.entity';

/**
 * Auth repository — database operations for authentication.
 * Handles employee lookups, refresh token storage, and password reset tokens.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findEmployeeByEmail(email: string) {
    return this.dataSource.getRepository(Employee).findOne({ where: { email } });
  }

  async findEmployeeById(id: string) {
    return this.dataSource.getRepository(Employee).findOne({ where: { id } });
  }

  async createEmployee(data: { name: string; email: string; passwordHash: string }) {
    const repo = this.dataSource.getRepository(Employee);
    const employee = repo.create({
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    });
    return repo.save(employee);
  }

  async storeRefreshToken(employeeId: string, tokenHash: string, expiresAt: Date) {
    const repo = this.dataSource.getRepository(RefreshToken);
    const token = repo.create({
      employeeId,
      tokenHash,
      expiresAt,
    });
    return repo.save(token);
  }

  async findRefreshToken(tokenHash: string) {
    return this.dataSource.getRepository(RefreshToken).findOne({ where: { tokenHash } });
  }

  async revokeRefreshToken(tokenId: string) {
    await this.dataSource.getRepository(RefreshToken).update(tokenId, { isRevoked: true });
  }

  async revokeAllRefreshTokens(employeeId: string) {
    await this.dataSource.getRepository(RefreshToken).update({ employeeId }, { isRevoked: true });
  }
}
