import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Public } from '../../common/decorators/public.decorator';
import { hashIp } from '../../infra/auth/auth.service';
import { CorpusItemsService } from './corpus-items.service';
import { ContributeDto } from './dto/contribute.dto';

const SESSION_COOKIE = 'session_id';
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

@Controller('corpus-items')
export class CorpusItemsController {
  constructor(private readonly corpusItemsService: CorpusItemsService) {}

  @Post('contribute')
  @Public()
  async contribute(@Body() dto: ContributeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = this.resolveSessionId(req, res);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.corpusItemsService.contribute(dto, { sessionId, ipHash: hashIp(ip) });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.corpusItemsService.findOne(id);
  }

  private resolveSessionId(req: Request, res: Response): string {
    const existing = req.cookies?.[SESSION_COOKIE];
    if (existing) {
      return existing;
    }
    const sessionId = randomUUID();
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
    });
    return sessionId;
  }
}
