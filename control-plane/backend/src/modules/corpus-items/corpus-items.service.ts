import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  assignDatasetSplit,
  checkNearDuplicates,
  cleanText,
  computeMatchKey,
  detectScript,
  detectUnit,
  isWithinLengthBounds,
  onCorpusItemIngested,
  searchCorpusItems,
  spawnTasks,
  type ExploreResult,
} from '@open-derja/core';
import type { Region } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { ContributeDto } from './dto/contribute.dto';
import { ExploreQueryDto } from './dto/explore-query.dto';

const NEAR_DUPLICATE_CANDIDATE_LIMIT = 20;

export interface ContributeContext {
  sessionId: string;
  ipHash: string;
}

export type ContributeResult =
  | { duplicate: true; existingCorpusItemId: string; knownRegions: Region[] }
  | { duplicate: false; id: string; unit: string; script: string; datasetSplit: string };

@Injectable()
export class CorpusItemsService {
  constructor(private readonly prisma: PrismaService) {}

  explore(query: ExploreQueryDto): Promise<ExploreResult> {
    return searchCorpusItems(this.prisma, query);
  }

  async contribute(dto: ContributeDto, ctx: ContributeContext): Promise<ContributeResult> {
    const cleaned = cleanText(dto.text);
    if (!isWithinLengthBounds(cleaned)) {
      throw new BadRequestException('Contribution is too short or too long');
    }

    const matchKey = computeMatchKey(cleaned);

    const candidates = await this.prisma.$queryRaw<Array<{ id: string; text: string }>>`
      SELECT id, text FROM corpus_items
      WHERE match_key % ${matchKey}
      ORDER BY similarity(match_key, ${matchKey}) DESC
      LIMIT ${NEAR_DUPLICATE_CANDIDATE_LIMIT}
    `;

    if (candidates.length > 0) {
      const { isNearDuplicate, matches } = await checkNearDuplicates(cleaned, candidates, process.env.DATA_PLANE_URL);
      if (isNearDuplicate) {
        const existingCorpusItemId = matches[0].id;
        const regionTags = await this.prisma.tag.findMany({
          where: { corpusItemId: existingCorpusItemId, kind: 'region' },
          select: { value: true },
          distinct: ['value'],
        });
        return {
          duplicate: true,
          existingCorpusItemId,
          knownRegions: regionTags.map((tag) => tag.value as Region),
        };
      }
    }

    const source = await this.getOrCreateContributionSource();

    let script = detectScript(cleaned);
    if (script === 'latin') {
      script = 'arabizi';
    }
    const unit = detectUnit(cleaned);
    const datasetSplit = assignDatasetSplit();

    const { corpusItem } = await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          sourceId: source.id,
          rawBody: dto.text,
          license: source.licenseDefault,
          rightsStatus: 'granted',
          ingestedAt: new Date(),
        },
      });

      const item = await tx.corpusItem.create({
        data: {
          documentId: document.id,
          unit,
          position: 0,
          text: cleaned,
          script,
          matchKey,
          charOffset: 0,
          datasetSplit,
        },
      });

      await tx.submissionMeta.create({
        data: {
          corpusItemId: item.id,
          contributorName: dto.contributorName,
          contributorEmail: dto.contributorEmail,
          selfReportedRegion: dto.selfReportedRegion,
          selfReportedOrigin: dto.selfReportedOrigin,
          sessionId: ctx.sessionId,
          ipHash: ctx.ipHash,
          consentGiven: dto.consentGiven,
          consentVoice: dto.consentVoice ?? false,
        },
      });

      return { corpusItem: item };
    });

    await spawnTasks(this.prisma, onCorpusItemIngested(corpusItem.id, corpusItem.version));

    return {
      duplicate: false,
      id: corpusItem.id,
      unit: corpusItem.unit,
      script: corpusItem.script,
      datasetSplit: corpusItem.datasetSplit,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.corpusItem.findUnique({
      where: { id },
      select: {
        id: true,
        unit: true,
        text: true,
        script: true,
        canonicalForm: true,
        version: true,
        createdAt: true,
        document: {
          select: { license: true, rightsStatus: true, regionHint: true, eraHint: true },
        },
      },
    });
    if (!item) {
      throw new NotFoundException('Corpus item not found');
    }
    return item;
  }

  private async getOrCreateContributionSource() {
    const existing = await this.prisma.source.findFirst({ where: { kind: 'contribution' } });
    if (existing) {
      return existing;
    }
    return this.prisma.source.create({
      data: {
        kind: 'contribution',
        name: 'Direct contribution',
        licenseDefault: 'cc_by_sa',
        active: true,
      },
    });
  }
}
