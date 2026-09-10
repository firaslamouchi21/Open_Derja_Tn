import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { CommentStatus } from '@open-derja/db';
import { AdminArea } from '../../../common/decorators/admin-area.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { ReviewLanesService } from './review-lanes.service';
import { ResolveLaneItemDto } from '../dto/admin.dto';

@Controller('admin/review-lanes')
@AdminArea()
export class ReviewLanesController {
  constructor(private readonly service: ReviewLanesService) {}

  @Get()
  lane() {
    return this.service.lane();
  }

  @Get('comments')
  comments(@Query('status') status?: CommentStatus) {
    return this.service.comments(status);
  }

  @Post('comments/toggle')
  toggleComments(@CurrentUser() user: RequestUser, @Body('open') open: boolean) {
    return this.service.setCommentsOpen(!!open, user.id);
  }

  @Post('comments/:id/:decision')
  moderateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('decision') decision: 'approve' | 'reject',
  ) {
    return this.service.moderateComment(id, decision);
  }

  @Post(':type/:id/resolve')
  resolve(
    @CurrentUser() user: RequestUser,
    @Param('type') type: 'correction' | 'origin' | 'publication' | 'flag',
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveLaneItemDto,
  ) {
    return this.service.resolve(type, id, dto.decision, user.id);
  }
}
