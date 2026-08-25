import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Flag, FlagStatus } from '@open-derja/db';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { hashIp } from '../../infra/auth/auth.service';
import { FlagsService } from './flags.service';
import { CreateFlagDto } from './dto/create-flag.dto';

const SESSION_COOKIE = 'session_id';
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Post()
  @Public()
  create(@Body() dto: CreateFlagDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<Flag> {
    const sessionId = this.resolveSessionId(req, res);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.flagsService.create(dto, { sessionId, ipHash: hashIp(ip) });
  }

  @Get()
  @Roles('reviewer', 'admin', 'superadmin')
  findAll(@Query('status') status?: FlagStatus): Promise<Flag[]> {
    return this.flagsService.findAll(status);
  }

  @Post(':id/resolve')
  @Roles('reviewer', 'admin', 'superadmin')
  resolve(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string): Promise<Flag> {
    return this.flagsService.resolve(id, user.id);
  }

  @Post(':id/dismiss')
  @Roles('reviewer', 'admin', 'superadmin')
  dismiss(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string): Promise<Flag> {
    return this.flagsService.dismiss(id, user.id);
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
