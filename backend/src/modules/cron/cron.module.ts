import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [NotificationsModule, ActivityLogModule],
  providers: [CronService],
})
export class CronModule {}
