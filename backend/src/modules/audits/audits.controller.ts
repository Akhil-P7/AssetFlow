import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { AuditsService } from './audits.service';
import { Roles, RefetchRole, CurrentUser } from '../../common/decorators';

/** Asset Audit — Spec 02 §7 */
@Controller('audits')
export class AuditsController {
  constructor(private readonly service: AuditsService) {}

  @Post()
  @Roles('ADMIN', 'ASSET_MANAGER')
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.service.getResults(id);
  }

  @Patch(':id/results/:assetId')
  updateResult(
    @Param('id') cycleId: string,
    @Param('assetId') assetId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateResult(cycleId, assetId, dto, user);
  }

  @Get(':id/discrepancy-report')
  @Roles('ADMIN', 'ASSET_MANAGER')
  getDiscrepancyReport(@Param('id') id: string) {
    return this.service.getDiscrepancyReport(id);
  }

  @Post(':id/close')
  @Roles('ADMIN', 'ASSET_MANAGER')
  @RefetchRole()
  close(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.close(id, user);
  }
}
