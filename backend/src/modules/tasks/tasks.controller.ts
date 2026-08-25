import { Body, Controller, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AllowUnverifiedEmail } from '../../common/decorators/allow-unverified-email.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { TasksService } from './tasks.service';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { ReviewTaskDto } from './dto/review-task.dto';
import { RegionTagTaskDto } from './dto/region-tag-task.dto';
import { ConfirmTaskDto } from './dto/confirm-task.dto';
import { TranslateTaskDto } from './dto/translate-task.dto';
import { StandardiseTaskDto } from './dto/standardise-task.dto';
import { LinkLemmaTaskDto } from './dto/link-lemma-task.dto';
import { AdjudicateTaskDto } from './dto/adjudicate-task.dto';
import { TransliterateTaskDto } from './dto/transliterate-task.dto';

const ALL_HUMAN_ROLES = ['contributor', 'trusted_contributor', 'reviewer', 'admin', 'superadmin'] as const;

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('claim')
  @Roles(...ALL_HUMAN_ROLES)
  @AllowUnverifiedEmail()
  async claim(@CurrentUser() user: RequestUser) {
    const task = await this.tasksService.claim(user);
    if (!task) {
      throw new NotFoundException('No task currently available for you');
    }
    return task;
  }

  @Post(':id/complete')
  @Roles(...ALL_HUMAN_ROLES)
  @AllowUnverifiedEmail()
  complete(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteTaskDto) {
    return this.tasksService.complete(user, id, dto.outputRecordId);
  }

  @Post(':id/review')
  @Roles('reviewer', 'admin', 'superadmin')
  review(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewTaskDto) {
    return this.tasksService.review(user, id, dto);
  }

  @Post(':id/region-tag')
  @Roles(...ALL_HUMAN_ROLES)
  @AllowUnverifiedEmail()
  regionTag(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RegionTagTaskDto) {
    return this.tasksService.regionTag(user, id, dto);
  }

  @Post(':id/confirm')
  @Roles(...ALL_HUMAN_ROLES)
  @AllowUnverifiedEmail()
  confirm(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmTaskDto) {
    return this.tasksService.confirm(user, id, dto);
  }

  @Post(':id/translate')
  @Roles(...ALL_HUMAN_ROLES)
  @AllowUnverifiedEmail()
  translate(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TranslateTaskDto) {
    return this.tasksService.translate(user, id, dto);
  }

  @Post(':id/transliterate')
  @Roles(...ALL_HUMAN_ROLES)
  @AllowUnverifiedEmail()
  transliterate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransliterateTaskDto,
  ) {
    return this.tasksService.transliterate(user, id, dto);
  }

  @Post(':id/standardise')
  @Roles('reviewer', 'admin', 'superadmin')
  standardise(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: StandardiseTaskDto) {
    return this.tasksService.standardise(user, id, dto);
  }

  @Post(':id/link-lemma')
  @Roles('reviewer', 'admin', 'superadmin')
  linkLemma(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkLemmaTaskDto) {
    return this.tasksService.linkLemma(user, id, dto);
  }

  @Post(':id/adjudicate')
  @Roles('reviewer', 'admin', 'superadmin')
  adjudicate(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdjudicateTaskDto) {
    return this.tasksService.adjudicate(user, id, dto);
  }

  @Post(':id/rework')
  @Roles('reviewer', 'admin', 'superadmin')
  rework(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.rework(id);
  }

  @Post(':id/reject')
  @Roles('reviewer', 'admin', 'superadmin')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.reject(id);
  }
}
