import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  addLexiconOrigin,
  attestLexiconVariantRegion,
  createLexiconEntry,
  createLexiconForm,
  createLexiconVariant,
  findLexiconEntry,
  searchLexiconEntries,
  type LexiconEntryDetail,
  type LexiconSearchResult,
} from '@open-derja/core';
import type { LexiconEntry, LexiconForm, LexiconOrigin, LexiconVariant, LexiconVariantRegion } from '@open-derja/db';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { hashIp } from '../../infra/auth/auth.service';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateLexiconEntryDto } from './dto/create-entry.dto';
import { CreateLexiconVariantDto } from './dto/create-variant.dto';
import { CreateLexiconFormDto } from './dto/create-form.dto';
import { AttestRegionDto } from './dto/attest-region.dto';
import { AddOriginDto } from './dto/add-origin.dto';

const SESSION_COOKIE = 'session_id';
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

@Controller('lexicon')
export class LexiconController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  search(@Query('q') q?: string, @Query('limit') limit?: string): Promise<LexiconSearchResult> {
    return searchLexiconEntries(this.prisma, q, limit ? Number(limit) : undefined);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LexiconEntryDetail> {
    const entry = await findLexiconEntry(this.prisma, id);
    if (!entry) {
      throw new NotFoundException('Lexicon entry not found');
    }
    return entry;
  }

  @Post()
  @Roles('reviewer', 'admin', 'superadmin')
  createEntry(@Body() dto: CreateLexiconEntryDto): Promise<LexiconEntry> {
    return createLexiconEntry(this.prisma, dto);
  }

  @Post(':id/variants')
  @Roles('reviewer', 'admin', 'superadmin')
  async createVariant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateLexiconVariantDto): Promise<LexiconVariant> {
    const variant = await createLexiconVariant(this.prisma, id, dto);
    if (!variant) {
      throw new NotFoundException('Lexicon entry not found');
    }
    return variant;
  }

  @Post('variants/:variantId/regions')
  @Roles('reviewer', 'admin', 'superadmin')
  async attestRegion(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: AttestRegionDto,
  ): Promise<LexiconVariantRegion> {
    const region = await attestLexiconVariantRegion(this.prisma, variantId, dto.region);
    if (!region) {
      throw new NotFoundException('Lexicon variant not found');
    }
    return region;
  }

  @Post('variants/:variantId/forms')
  @Roles('reviewer', 'admin', 'superadmin')
  async createForm(@Param('variantId', ParseUUIDPipe) variantId: string, @Body() dto: CreateLexiconFormDto): Promise<LexiconForm> {
    const form = await createLexiconForm(this.prisma, variantId, { ...dto, isMachine: false });
    if (!form) {
      throw new NotFoundException('Lexicon variant not found');
    }
    return form;
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
    const ctx = user
      ? { proposedBy: user.id }
      : (() => {
          const sessionId = this.resolveSessionId(req, res);
          const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
          return { sessionId, ipHash: hashIp(ip) };
        })();
    const origin = await addLexiconOrigin(this.prisma, id, { ...dto, ...ctx });
    if (!origin) {
      throw new NotFoundException('Lexicon entry not found');
    }
    return origin;
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
