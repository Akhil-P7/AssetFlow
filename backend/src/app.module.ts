import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { databaseConfig, jwtConfig, appConfig, redisConfig } from './config';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AllocationsModule } from './modules/allocations/allocations.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AuditsModule } from './modules/audits/audits.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
      load: [databaseConfig, jwtConfig, appConfig, redisConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        autoLoadEntities: true,
        synchronize: false, // NEVER true in production — use migrations
        logging: config.get('app.nodeEnv') === 'development',
      }),
    }),

    // Scheduled jobs
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Feature modules
    AuthModule,
    OrgModule,
    AssetsModule,
    AllocationsModule,
    BookingsModule,
    MaintenanceModule,
    AuditsModule,
    NotificationsModule,
    ActivityLogModule,
    ReportsModule,
    DashboardModule,
  ],
})
export class AppModule {}
