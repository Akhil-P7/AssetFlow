import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { Roles, RefetchRole, CurrentUser } from '../../common/decorators';

/** Maintenance Management — Spec 02 §6 */
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Post(':id/approve')
  @Roles('ASSET_MANAGER')
  @RefetchRole()
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user);
  }

  @Post(':id/reject')
  @Roles('ASSET_MANAGER')
  reject(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.reject(id, dto, user);
  }

  @Post(':id/assign-technician')
  @Roles('ASSET_MANAGER')
  assignTechnician(@Param('id') id: string, @Body() dto: any) {
    return this.service.assignTechnician(id, dto);
  }

  @Post(':id/start')
  @Roles('ASSET_MANAGER')
  start(@Param('id') id: string) {
    return this.service.start(id);
  }

  @Post(':id/resolve')
  @Roles('ASSET_MANAGER')
  @RefetchRole()
  resolve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.resolve(id, user);
  }
}
