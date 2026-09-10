import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Superadmin } from '../../../common/decorators/superadmin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { SnapshotsService } from './snapshots.service';
import { CreateSnapshotDto, DeprecateSnapshotDto } from '../dto/admin.dto';

@Controller('admin/snapshots')
@Superadmin()
export class SnapshotsController {
  constructor(private readonly service: SnapshotsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('diff')
  diff(@Query('a', ParseUUIDPipe) a: string, @Query('b', ParseUUIDPipe) b: string) {
    return this.service.diff(a, b);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSnapshotDto) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/deprecate')
  deprecate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeprecateSnapshotDto,
  ) {
    return this.service.deprecate(id, dto, user.id);
  }
}
