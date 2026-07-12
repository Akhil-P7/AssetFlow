import { Module } from '@nestjs/common';
import { AllocationsController } from './allocations.controller';
import { AllocationsService } from './allocations.service';
import { AllocationsRepository } from './allocations.repository';
import { AssetsModule } from '../assets/assets.module';

/** Allocations + Transfers — tightly coupled domain (Spec 05 §1) */
@Module({
  imports: [AssetsModule],
  controllers: [AllocationsController],
  providers: [AllocationsService, AllocationsRepository],
  exports: [AllocationsService],
})
export class AllocationsModule {}
