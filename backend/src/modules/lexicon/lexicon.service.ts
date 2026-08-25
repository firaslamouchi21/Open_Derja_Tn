import { Injectable, NotFoundException } from '@nestjs/common';
import { computeMatchKey } from '@open-derja/core';
import type {
  LexiconEntry,
  LexiconForm,
  LexiconOrigin,
  LexiconVariant,
  LexiconVariantRegion,
  Prisma,
  Region,
} from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateLexiconEntryDto } from './dto/create-entry.dto';
import { CreateLexiconVariantDto } from './dto/create-variant.dto';
import { CreateLexiconFormDto } from './dto/create-form.dto';
import { AddOriginDto } from './dto/add-origin.dto';

export interface OriginContext {
  proposedBy?: string;
  sessionId?: string;
  ipHash?: string;
}

const ENTRY_INCLUDE = {
  variants: {
    include: {
      regions: true,
      forms: true,
    },
  },
  origins: true,
} satisfies Prisma.LexiconEntryInclude;

export type LexiconEntryDetail = Prisma.LexiconEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

export interface LexiconSearchResult {
  items: LexiconEntryDetail[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class LexiconService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string | undefined, limit = 20): Promise<LexiconSearchResult> {
    const where: Prisma.LexiconEntryWhereInput | undefined = q
      ? {
          OR: [
            { glossEn: { contains: q, mode: 'insensitive' } },
            { glossFr: { contains: q, mode: 'insensitive' } },
            { glossMsa: { contains: q, mode: 'insensitive' } },
            { variants: { some: { canonicalForm: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lexiconEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lexiconEntry.count({ where }),
    ]);

    return { items, total, page: 1, pageSize: limit };
  }

  async findOne(id: string): Promise<LexiconEntryDetail> {
    const entry = await this.prisma.lexiconEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
    if (!entry) {
      throw new NotFoundException('Lexicon entry not found');
    }
    return entry;
  }

  createEntry(dto: CreateLexiconEntryDto): Promise<LexiconEntry> {
    return this.prisma.lexiconEntry.create({
      data: {
        glossEn: dto.glossEn,
        glossFr: dto.glossFr,
        glossMsa: dto.glossMsa,
        domain: dto.domain,
        granularity: dto.granularity,
        pos: dto.pos,
        notes: dto.notes,
      },
    });
  }

  async createVariant(entryId: string, dto: CreateLexiconVariantDto): Promise<LexiconVariant> {
    await this.assertEntryExists(entryId);
    return this.prisma.lexiconVariant.create({
      data: {
        lexiconEntryId: entryId,
        scope: dto.scope,
        era: dto.era,
        setting: dto.setting,
        register: dto.register,
        canonicalForm: dto.canonicalForm,
        matchKey: computeMatchKey(dto.canonicalForm),
      },
    });
  }

  async attestRegion(variantId: string, region: Region): Promise<LexiconVariantRegion> {
    await this.assertVariantExists(variantId);
    return this.prisma.lexiconVariantRegion.upsert({
      where: { lexiconVariantId_region: { lexiconVariantId: variantId, region } },
      create: { lexiconVariantId: variantId, region, attestationCount: 1 },
      update: { attestationCount: { increment: 1 } },
    });
  }

  async createForm(
    variantId: string,
    dto: CreateLexiconFormDto,
    ctx: { isMachine: boolean },
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<LexiconForm> {
    await this.assertVariantExists(variantId, client);
    return client.lexiconForm.create({
      data: {
        lexiconVariantId: variantId,
        text: dto.text,
        script: dto.script,
        matchKey: computeMatchKey(dto.text),
        isCanonical: !ctx.isMachine,
      },
    });
  }

  async addOrigin(entryId: string, dto: AddOriginDto, ctx: OriginContext): Promise<LexiconOrigin> {
    await this.assertEntryExists(entryId);
    return this.prisma.lexiconOrigin.create({
      data: {
        lexiconEntryId: entryId,
        origin: dto.origin,
        sourceForm: dto.sourceForm,
        sourceLang: dto.sourceLang,
        note: dto.note,
        proposedBy: ctx.proposedBy,
        sessionId: ctx.sessionId,
        ipHash: ctx.ipHash,
        status: 'proposed',
      },
    });
  }

  private async assertEntryExists(id: string) {
    const exists = await this.prisma.lexiconEntry.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Lexicon entry not found');
    }
  }

  private async assertVariantExists(id: string, client: PrismaService | Prisma.TransactionClient = this.prisma) {
    const exists = await client.lexiconVariant.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Lexicon variant not found');
    }
  }
}
