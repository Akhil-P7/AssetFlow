import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Patch,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CurrentUser } from '../../common/decorators';

/** Resource Booking — Spec 02 §5 */
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('resource/:assetId/calendar')
  getCalendar(@Param('assetId') assetId: string, @Query() query: any) {
    return this.service.getCalendar(assetId, query);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.cancel(id, dto, user);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.reschedule(id, dto, user);
  }
}
