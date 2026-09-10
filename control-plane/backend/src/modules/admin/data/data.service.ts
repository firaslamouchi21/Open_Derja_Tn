import { BadRequestException, Injectable } from '@nestjs/common';
import { writeAuditLog } from '@open-derja/core';
import type { Prisma } from '@open-derja/db';
import { PrismaService } from '../../../infra/database/prisma.service';
import { assertConfirmedCount } from '../../../common/assert-confirmed-count';
import { BulkReassignRegionDto, BulkRejectScrapeBatchDto, MergeLexiconDto } from '../dto/admin.dto';

const BROWSABLE = {
  sources: 'source',
  documents: 'document',
  corpus_items: 'corpusItem',
  lexicon_entries: 'lexiconEntry',
  lexicon_variants: 'lexiconVariant',
  translations: 'translation',
  tasks: 'task',
  flags: 'flag',
  corrections: 'correction',
  users: 'user',
} as const;

type BrowsableTable = keyof typeof BROWSABLE;

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async browse(table: string, skip: number, take: number): Promise<{ rows: unknown[]; total: number }> {
    if (!Object.prototype.hasOwnProperty.call(BROWSABLE, table)) {
      throw new BadRequestException(`Table "${table}" is not browsable`);
    }
    const delegate = (this.prisma as unknown as Record<string, {
      findMany: (a: unknown) => Promise<unknown[]>;
      count: () => Promise<number>;
    }>)[BROWSABLE[table as BrowsableTable]];
    const [rows, total] = await Promise.all([
      delegate.findMany({ skip, take: Math.min(take, 200), orderBy: { createdAt: 'desc' } }),
      delegate.count(),
    ]);
    return { rows, total };
  }

  async rejectScrapeBatch(dto: BulkRejectScrapeBatchDto, actorId: string): Promise<{ rejected: number }> {
    const items = await this.prisma.corpusItem.findMany({
      where: { documentId: dto.documentId },
      select: { id: true },
    });
    assertConfirmedCount(items.length, dto.confirmCount);

    await this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { corpusItemId: { in: items.map((i) => i.id) }, status: { in: ['open', 'claimed', 'needs_rework'] } },
        data: { status: 'rejected' },
      });
      await tx.document.update({ where: { id: dto.documentId }, data: { rightsStatus: 'revoked' } });
      await writeAuditLog(tx, {
        actorId,
        action: 'bulk_reject_scrape_batch',
        entityType: 'document',
        entityId: dto.documentId,
        diff: { rejectedItems: items.length, reason: dto.reason ?? null },
      });
    });

    return { rejected: items.length };
  }

  async reassignRegion(dto: BulkReassignRegionDto, actorId: string): Promise<{ updated: number }> {
    assertConfirmedCount(dto.corpusItemIds.length, dto.confirmCount);
    await this.prisma.$transaction(async (tx) => {
      for (const id of dto.corpusItemIds) {
        const item = await tx.corpusItem.findUniqueOrThrow({ where: { id }, select: { text: true, version: true } });
        await tx.tag.deleteMany({ where: { corpusItemId: id, kind: 'region' } });
        for (const region of dto.regions) {
          await tx.tag.create({
            data: {
              corpusItemId: id,
              kind: 'region',
              value: region,
              charStart: 0,
              charEnd: item.text.length,
              annotatorId: actorId,
              isMachine: false,
            },
          });
        }
        await tx.corpusItem.update({ where: { id }, data: { version: { increment: 1 } } });
      }
      await writeAuditLog(tx, {
        actorId,
        action: 'bulk_reassign_region',
        entityType: 'corpus_item',
        entityId: dto.corpusItemIds[0],
        diff: { corpusItemIds: dto.corpusItemIds, regions: dto.regions },
      });
    });
    return { updated: dto.corpusItemIds.length };
  }

  async mergeLexiconEntries(dto: MergeLexiconDto, actorId: string): Promise<{ movedVariants: number }> {
    if (dto.sourceEntryId === dto.targetEntryId) {
      throw new BadRequestException('Cannot merge an entry into itself');
    }
    return this.prisma.$transaction(async (tx) => {
      const moved = await tx.lexiconVariant.updateMany({
        where: { lexiconEntryId: dto.sourceEntryId },
        data: { lexiconEntryId: dto.targetEntryId },
      });
      await tx.lexiconOrigin.updateMany({
        where: { lexiconEntryId: dto.sourceEntryId },
        data: { lexiconEntryId: dto.targetEntryId },
      });
      await tx.translation.updateMany({
        where: { lexiconEntryId: dto.sourceEntryId },
        data: { lexiconEntryId: dto.targetEntryId },
      });
      await writeAuditLog(tx, {
        actorId,
        action: 'merge_lexicon_entries',
        entityType: 'lexicon_entry',
        entityId: dto.targetEntryId,
        diff: { mergedFrom: dto.sourceEntryId, movedVariants: moved.count },
      });
      return { movedVariants: moved.count };
    });
  }

  translatorMisses(): Promise<unknown[]> {
    return this.prisma.translatorRegionMiss.findMany({ orderBy: { missRate: 'desc' } });
  }

  async translatorMissLog(limit = 100): Promise<Array<{ matchKey: string; queryText: string; searches: number }>> {
    const grouped = await this.prisma.translatorLookup.groupBy({
      by: ['matchKey'],
      where: { hit: false },
      _count: { _all: true },
      _max: { queryText: true },
      orderBy: { _count: { matchKey: 'desc' } },
      take: Math.min(limit, 500),
    });
    return grouped.map((row) => ({
      matchKey: row.matchKey,
      queryText: row._max.queryText ?? row.matchKey,
      searches: row._count._all,
    }));
  }
}
