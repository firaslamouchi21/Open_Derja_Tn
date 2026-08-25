import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Correction, CorrectionStatus, Prisma } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { ProposeCorrectionDto } from './dto/propose-correction.dto';

type CorrectableTable = 'corpus_items' | 'lexicon_entries' | 'lexicon_variants' | 'documents';

const CORRECTABLE_FIELDS: Record<CorrectableTable, ReadonlySet<string>> = {
  corpus_items: new Set(['canonicalForm']),
  lexicon_entries: new Set(['glossEn', 'glossFr', 'glossMsa', 'notes']),
  lexicon_variants: new Set(['canonicalForm']),
  documents: new Set(['title']),
};

function isCorrectableTable(table: string): table is CorrectableTable {
  return Object.prototype.hasOwnProperty.call(CORRECTABLE_FIELDS, table);
}

@Injectable()
export class CorrectionsService {
  constructor(private readonly prisma: PrismaService) {}

  propose(dto: ProposeCorrectionDto, proposedBy?: string): Promise<Correction> {
    return this.prisma.correction.create({
      data: {
        targetTable: dto.targetTable,
        targetId: dto.targetId,
        field: dto.field,
        oldValue: dto.oldValue,
        newValue: dto.newValue,
        reason: dto.reason,
        proposedBy,
      },
    });
  }

  findAll(status?: CorrectionStatus): Promise<Correction[]> {
    return this.prisma.correction.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Correction> {
    const correction = await this.prisma.correction.findUnique({ where: { id } });
    if (!correction) {
      throw new NotFoundException('Correction not found');
    }
    return correction;
  }

  async accept(id: string, reviewerId: string): Promise<Correction> {
    const correction = await this.findOne(id);
    if (!isCorrectableTable(correction.targetTable) || !CORRECTABLE_FIELDS[correction.targetTable].has(correction.field)) {
      throw new BadRequestException(
        `Corrections to ${correction.targetTable}.${correction.field} aren't supported — this field isn't on the whitelist`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.applyCorrection(tx, correction.targetTable as CorrectableTable, correction.targetId, correction.field, correction.newValue);
      if (correction.targetTable === 'corpus_items') {
        await tx.corpusItem.update({ where: { id: correction.targetId }, data: { version: { increment: 1 } } });
      }
      return tx.correction.update({
        where: { id },
        data: { status: 'accepted', reviewedBy: reviewerId },
      });
    });
  }

  async reject(id: string, reviewerId: string): Promise<Correction> {
    await this.findOne(id);
    return this.prisma.correction.update({
      where: { id },
      data: { status: 'rejected', reviewedBy: reviewerId },
    });
  }

  private applyCorrection(
    tx: Prisma.TransactionClient,
    table: CorrectableTable,
    targetId: string,
    field: string,
    value: string | null,
  ): Promise<unknown> {
    switch (table) {
      case 'corpus_items':
        return tx.corpusItem.update({
          where: { id: targetId },
          data: { [field]: value } as Prisma.CorpusItemUpdateInput,
        });
      case 'lexicon_entries':
        return tx.lexiconEntry.update({
          where: { id: targetId },
          data: { [field]: value } as Prisma.LexiconEntryUpdateInput,
        });
      case 'lexicon_variants':
        return tx.lexiconVariant.update({
          where: { id: targetId },
          data: { [field]: value } as Prisma.LexiconVariantUpdateInput,
        });
      case 'documents':
        return tx.document.update({
          where: { id: targetId },
          data: { [field]: value } as Prisma.DocumentUpdateInput,
        });
    }
  }
}
