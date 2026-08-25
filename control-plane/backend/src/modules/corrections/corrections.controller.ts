import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { Correction, CorrectionStatus } from '@open-derja/db';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { CorrectionsService } from './corrections.service';
import { ProposeCorrectionDto } from './dto/propose-correction.dto';

@Controller('corrections')
export class CorrectionsController {
  constructor(private readonly correctionsService: CorrectionsService) {}

  @Post()
  @Public()
  propose(@Body() dto: ProposeCorrectionDto, @CurrentUser() user?: RequestUser): Promise<Correction> {
    return this.correctionsService.propose(dto, user?.id);
  }

  @Get()
  @Roles('reviewer', 'admin', 'superadmin')
  findAll(@Query('status') status?: CorrectionStatus): Promise<Correction[]> {
    return this.correctionsService.findAll(status);
  }

  @Post(':id/accept')
  @Roles('reviewer', 'admin', 'superadmin')
  accept(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string): Promise<Correction> {
    return this.correctionsService.accept(id, user.id);
  }

  @Post(':id/reject')
  @Roles('reviewer', 'admin', 'superadmin')
  reject(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string): Promise<Correction> {
    return this.correctionsService.reject(id, user.id);
  }
}
