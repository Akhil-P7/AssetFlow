import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';

/** Notifications — Spec 02 §9 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.service.findAll(query, user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markRead(id, user);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.service.markAllRead(user);
  }
}
