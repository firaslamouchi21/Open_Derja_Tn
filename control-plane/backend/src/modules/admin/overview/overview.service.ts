import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/database/prisma.service';

export interface Widget {
  value: unknown;
  alert: boolean;
  detail?: string;
  available?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<Record<string, Widget>> {
    const now = Date.now();
    const since24h = new Date(now - DAY_MS);
    const since7d = new Date(now - 7 * DAY_MS);

    const [
      ingested24h,
      ingested7d,
      reviewed24h,
      reviewed7d,
      openByType,
      oldestOpen,
      regionStats,
      consensusAgg,
      adjudicationBacklog,
      regionMiss,
      translatorStats,
      newContributors7d,
      sources,
      disabledForFailure,
      queueDepth,
      lastBackup,
    ] = await Promise.all([
      this.prisma.corpusItem.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.corpusItem.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.task.count({ where: { type: 'review', status: 'done', completedAt: { gte: since24h } } }),
      this.prisma.task.count({ where: { type: 'review', status: 'done', completedAt: { gte: since7d } } }),
      this.prisma.task.groupBy({ by: ['type'], where: { status: 'open' }, _count: { _all: true } }),
      this.prisma.task.findFirst({ where: { status: 'open' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.regionStats.findMany(),
      this.prisma.tagConsensus.aggregate({ _avg: { agreement: true } }),
      this.prisma.tagConsensus.count({ where: { needsAdjudication: true } }),
      this.prisma.translatorRegionMiss.findMany(),
      this.prisma.translatorStats.findUnique({ where: { id: 1 } }),
      this.prisma.contributorStats.count({ where: { lastContributedAt: { gte: since7d } } }),
      this.prisma.source.findMany({ select: { name: true, active: true, lastRunAt: true } }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'source', action: 'scrape_source_disabled' },
        distinct: ['entityId'],
        select: { entityId: true },
      }),
      this.prisma.outboxEvent.count({ where: { status: { in: ['pending', 'processing'] } } }),
      this.prisma.databaseBackup.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, restoreOk: true } }),
    ]);

    const totalRegion = regionStats.reduce((sum, r) => sum + r.corpusItemCount, 0);
    const worstRegionShare = regionStats.length
      ? Math.min(...regionStats.map((r) => (totalRegion ? r.corpusItemCount / totalRegion : 0)))
      : 1;
    const avgAgreement = consensusAgg._avg.agreement ? Number(consensusAgg._avg.agreement) : 1;
    const worstMiss = regionMiss.length ? Math.max(...regionMiss.map((m) => Number(m.missRate))) : 0;
    const oldestOpenDays = oldestOpen ? (now - oldestOpen.createdAt.getTime()) / DAY_MS : 0;
    const failingSources = disabledForFailure.length;
    const backupAgeHours = lastBackup ? (now - lastBackup.createdAt.getTime()) / (60 * 60 * 1000) : Infinity;

    return {
      pipelineThroughput: {
        value: { ingested24h, ingested7d, reviewed24h, reviewed7d },
        alert: reviewed7d < ingested7d,
        detail: 'review rate vs ingest rate over 7 days',
      },
      taskQueueHealth: {
        value: { openByType: openByType.map((t) => ({ type: t.type, open: t._count._all })), oldestOpenDays },
        alert: oldestOpenDays > 14,
      },
      regionalBalance: {
        value: { perRegion: regionStats.map((r) => ({ region: r.region, count: r.corpusItemCount })), worstRegionShare },
        alert: totalRegion > 0 && worstRegionShare < 0.15,
        available: regionStats.length > 0,
      },
      annotatorAgreement: {
        value: { avgAgreement, adjudicationBacklog },
        alert: avgAgreement < 0.7,
      },
      outOfRegionAdjudication: {
        value: regionStats.map((r) => ({ region: r.region, rate: r.outOfRegionAdjudicationRate ? Number(r.outOfRegionAdjudicationRate) : null })),
        alert: regionStats.some((r) => r.outOfRegionAdjudicationRate && Number(r.outOfRegionAdjudicationRate) > 0.2),
        available: regionStats.length > 0,
      },
      translatorCoverage: {
        value: { hitRate: translatorStats?.hitRate ? Number(translatorStats.hitRate) : null, worstMiss },
        alert: worstMiss > 0.6,
        available: !!translatorStats,
      },
      contributorActivity: {
        value: { active7d: newContributors7d },
        alert: newContributors7d === 0,
      },
      scraperStatus: {
        value: sources,
        alert: failingSources > 0,
      },
      serviceHealth: {
        value: null,
        alert: false,
        available: false,
        detail: 'nlp/media health-check reads not wired to the admin overview yet',
      },
      system: {
        value: { queueDepth, lastBackupAt: lastBackup?.createdAt ?? null, lastRestoreOk: lastBackup?.restoreOk ?? null },
        alert: queueDepth > 1000 || backupAgeHours > 48,
      },
    };
  }
}
