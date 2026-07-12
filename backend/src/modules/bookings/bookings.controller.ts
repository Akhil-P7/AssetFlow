import { Controller, Get, Post, Param, Body, Query, Patch, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CreateBookingDto, CancelBookingDto, RescheduleBookingDto } from './bookings.dto';

/** Resource Booking — Spec 02 §5 */
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  findAll(@Query() query: any, @CurrentUser() user: any) { return this.service.findAll(query, user); }

  @Get('resource/:assetId/calendar')
  getCalendar(@Param('assetId') assetId: string, @Query() query: any) {
    return this.service.getCalendar(assetId, query);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) { return this.service.create(dto, user); }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelBookingDto, @CurrentUser() user: any) {
    return this.service.cancel(id, dto, user);
  }

  @Patch(':id/reschedule')
  reschedule(@Param('id') id: string, @Body() dto: RescheduleBookingDto, @CurrentUser() user: any) {
    return this.service.reschedule(id, dto, user);
  }
}