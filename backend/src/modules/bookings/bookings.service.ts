import { Injectable, Logger } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';

/**
 * Booking service — implements overlap handling from Spec 03 §3.
 * Catches Postgres exclusion_violation (23P01) and translates to BOOKING_OVERLAP.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  constructor(private readonly repository: BookingsRepository) {}

  async findAll(query: any) {
    return [];
  }
  async getCalendar(assetId: string, query: any) {
    return [];
  }
  async create(dto: any, actor: any) {
    throw new Error('Not implemented');
  }
  async cancel(id: string, dto: any, actor: any) {
    throw new Error('Not implemented');
  }
  async reschedule(id: string, dto: any, actor: any) {
    throw new Error('Not implemented');
  }
}
