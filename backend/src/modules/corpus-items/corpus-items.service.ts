import { Injectable, NotFoundException } from '@nestjs/common';
import { assignDatasetSplit, computeMatchKey, detectScript, detectUnit, onCorpusItemIngested, spawnTasks } from '@open-derja/core';
import { PrismaService } from '../../infra/database/prisma.service';
import { ContributeDto } from './dto/contribute.dto';

export interface ContributeContext {
  sessionId: string;
  ipHash: string;
}

@Injectable()
export class CorpusItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async contribute(dto: ContributeDto, ctx: ContributeContext) {
    const source = await this.getOrCreateContributionSource();

    let script = detectScript(dto.text);
    if (script === 'latin') {
      script = 'arabizi';
    }
    const unit = detectUnit(dto.text);
    const matchKey = computeMatchKey(dto.text);
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
          text: dto.text,
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
        licenseDefault: 'unknown',
        active: true,
      },
    });
  }
}
