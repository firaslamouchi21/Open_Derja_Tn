import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { Superadmin } from '../../../common/decorators/superadmin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { SystemService } from './system.service';
import { SetMaintenanceDto, UpsertFeatureFlagDto } from '../dto/admin.dto';

@Controller('admin/system')
@Superadmin()
export class SystemController {
  constructor(private readonly service: SystemService) {}

  @Get('jobs')
  jobs() {
    return this.service.jobs();
  }

  @Get('backups')
  backups() {
    return this.service.backups();
  }

  @Get('feature-flags')
  featureFlags() {
    return this.service.featureFlags();
  }

  @Put('feature-flags')
  upsertFeatureFlag(@CurrentUser() user: RequestUser, @Body() dto: UpsertFeatureFlagDto) {
    return this.service.upsertFeatureFlag(dto, user.id);
  }

  @Put('maintenance')
  setMaintenance(@CurrentUser() user: RequestUser, @Body() dto: SetMaintenanceDto) {
    return this.service.setMaintenance(dto, user.id);
  }

  @Get('audit-log')
  auditLog(
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    return this.service.auditLog({
      actorId,
      entityType,
      action,
      skip: Number(skip) || 0,
      take: Number(take) || 50,
    });
  }
}
