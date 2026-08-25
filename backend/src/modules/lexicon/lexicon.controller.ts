import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { LexiconEntry, LexiconForm, LexiconOrigin, LexiconVariant, LexiconVariantRegion } from '@open-derja/db';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { hashIp } from '../../infra/auth/auth.service';
import { LexiconService, type LexiconEntryDetail, type LexiconSearchResult } from './lexicon.service';
import { CreateLexiconEntryDto } from './dto/create-entry.dto';
import { CreateLexiconVariantDto } from './dto/create-variant.dto';
import { CreateLexiconFormDto } from './dto/create-form.dto';
import { AttestRegionDto } from './dto/attest-region.dto';
import { AddOriginDto } from './dto/add-origin.dto';

const SESSION_COOKIE = 'session_id';
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

@Controller('lexicon')
export class LexiconController {
  constructor(private readonly lexiconService: LexiconService) {}

  @Get()
  @Public()
  search(@Query('q') q?: string, @Query('limit') limit?: string): Promise<LexiconSearchResult> {
    return this.lexiconService.search(q, limit ? Number(limit) : undefined);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LexiconEntryDetail> {
    return this.lexiconService.findOne(id);
  }

  @Post()
  @Roles('reviewer', 'admin', 'superadmin')
  createEntry(@Body() dto: CreateLexiconEntryDto): Promise<LexiconEntry> {
    return this.lexiconService.createEntry(dto);
  }

  @Post(':id/variants')
  @Roles('reviewer', 'admin', 'superadmin')
  createVariant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateLexiconVariantDto): Promise<LexiconVariant> {
    return this.lexiconService.createVariant(id, dto);
  }

  @Post('variants/:variantId/regions')
  @Roles('reviewer', 'admin', 'superadmin')
  attestRegion(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: AttestRegionDto,
  ): Promise<LexiconVariantRegion> {
    return this.lexiconService.attestRegion(variantId, dto.region);
  }

  @Post('variants/:variantId/forms')
  @Roles('reviewer', 'admin', 'superadmin')
  createForm(@Param('variantId', ParseUUIDPipe) variantId: string, @Body() dto: CreateLexiconFormDto): Promise<LexiconForm> {
    return this.lexiconService.createForm(variantId, dto, { isMachine: false });
  }

  @Post(':id/origins')
  @Public()
  async addOrigin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOriginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: RequestUser,
  ): Promise<LexiconOrigin> {
    if (user) {
      return this.lexiconService.addOrigin(id, dto, { proposedBy: user.id });
    }
    const sessionId = this.resolveSessionId(req, res);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.lexiconService.addOrigin(id, dto, { sessionId, ipHash: hashIp(ip) });
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
