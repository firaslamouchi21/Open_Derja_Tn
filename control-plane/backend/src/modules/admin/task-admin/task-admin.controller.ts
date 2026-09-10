import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AdminArea } from '../../../common/decorators/admin-area.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { TaskAdminService } from './task-admin.service';
import { PauseTaskTypeDto, ReassignTaskDto, ReprioritiseTasksDto } from '../dto/admin.dto';

@Controller('admin/tasks')
@AdminArea()
export class TaskAdminController {
  constructor(private readonly service: TaskAdminService) {}

  @Post('reprioritise')
  reprioritise(@CurrentUser() user: RequestUser, @Body() dto: ReprioritiseTasksDto) {
    return this.service.reprioritise(dto, user.id);
  }

  @Post('pause')
  pause(@CurrentUser() user: RequestUser, @Body() dto: PauseTaskTypeDto) {
    return this.service.pause(dto.type, user.id);
  }

  @Post('resume')
  resume(@CurrentUser() user: RequestUser, @Body() dto: PauseTaskTypeDto) {
    return this.service.resume(dto.type, user.id);
  }

  @Post(':id/force-release')
  forceRelease(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.forceRelease(id, user.id);
  }

  @Post(':id/reassign')
  reassign(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignTaskDto,
  ) {
    return this.service.reassign(id, dto.userId, user.id);
  }
}
