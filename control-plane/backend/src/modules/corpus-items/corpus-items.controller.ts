import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { resolveContributorSessionId } from '../../common/utils/contributor-session';
import { hashIp } from '../../infra/auth/auth.service';
import { CorpusItemsService } from './corpus-items.service';
import { ContributeDto } from './dto/contribute.dto';
import { ExploreQueryDto } from './dto/explore-query.dto';

@Controller('corpus-items')
export class CorpusItemsController {
  constructor(private readonly corpusItemsService: CorpusItemsService) {}

  @Get()
  @Public()
  search(@Query() query: ExploreQueryDto) {
    return this.corpusItemsService.explore(query);
  }

  @Post('contribute')
  @Public()
  async contribute(@Body() dto: ContributeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = resolveContributorSessionId(req, res);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.corpusItemsService.contribute(dto, { sessionId, ipHash: hashIp(ip) });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.corpusItemsService.findOne(id);
  }
}
