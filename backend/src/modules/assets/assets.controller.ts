import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Roles, CurrentUser } from '../../common/decorators';

/** Asset Registration & Directory — Spec 02 §3 */
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Get('tag/:assetTag')
  findByTag(@Param('assetTag') tag: string) {
    return this.service.findByTag(tag);
  }

  @Post()
  @Roles('ADMIN', 'ASSET_MANAGER')
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ASSET_MANAGER')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  /** Manual status transition — validated against state machine (Spec 03 §1) */
  @Post(':id/transition')
  @Roles('ADMIN', 'ASSET_MANAGER')
  transition(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.transitionStatus(id, dto, user);
  }
}
