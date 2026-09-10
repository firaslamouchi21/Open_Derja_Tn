import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Superadmin } from '../../../common/decorators/superadmin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/guards/request-user.interface';
import { PrivacyService } from './privacy.service';
import { CreateRevocationDto } from '../dto/admin.dto';

@Controller('admin/privacy')
@Superadmin()
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get('revocations')
  log() {
    return this.service.log();
  }

  @Get('revocations/preview')
  preview(@Query('session') session?: string, @Query('user') user?: string) {
    return this.service.preview(session, user);
  }

  @Get('sar')
  sar(@Query('session') session?: string, @Query('user') user?: string) {
    return this.service.subjectAccessRequest(session, user);
  }

  @Post('revocations')
  createRevocation(@CurrentUser() user: RequestUser, @Body() dto: CreateRevocationDto) {
    return this.service.createRevocation(dto, user.id);
  }
}
