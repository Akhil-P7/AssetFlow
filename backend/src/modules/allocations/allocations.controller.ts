import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { Roles, RefetchRole, CurrentUser } from '../../common/decorators';

/** Allocation & Transfer — Spec 02 §4 */
@Controller()
export class AllocationsController {
  constructor(private readonly service: AllocationsService) {}

  // --- Allocations ---
  @Get('allocations')
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.service.findAll(query, user);
  }

  @Post('allocations')
  @Roles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD')
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.allocate(dto, user);
  }

  @Post('allocations/:id/return')
  returnAsset(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.returnAsset(id, dto, user);
  }

  // --- Transfers ---
  @Get('transfers')
  findTransfers(@Query() query: any, @CurrentUser() user: any) {
    return this.service.findTransfers(query, user);
  }

  @Post('transfers')
  requestTransfer(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.requestTransfer(dto, user);
  }

  @Post('transfers/:id/approve')
  @Roles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD')
  @RefetchRole()
  approveTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approveTransfer(id, user);
  }

  @Post('transfers/:id/reject')
  @Roles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD')
  rejectTransfer(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.rejectTransfer(id, dto, user);
  }
}
