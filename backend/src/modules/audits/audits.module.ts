import { Module } from '@nestjs/common';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';
import { AuditsRepository } from './audits.repository';

/** Audit cycles, discrepancy reports — Spec 02 §7 */
@Module({
  controllers: [AuditsController],
  providers: [AuditsService, AuditsRepository],
  exports: [AuditsService],
})
export class AuditsModule {}
