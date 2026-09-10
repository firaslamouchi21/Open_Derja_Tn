import type { PrismaClient, Region } from '@open-derja/db';

const MAX_LEADERBOARD_LIMIT = 200;
const DEFAULT_LEADERBOARD_LIMIT = 50;
const WEAK_REGION_SHARE_THRESHOLD = 0.15;

export interface LeaderboardEntry {
  contributorName: string | null;
  region: Region | null;
  approvedCount: number;
  lastContributedAt: Date;
}

export function getLeaderboard(prisma: PrismaClient, region?: Region, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
  return prisma.contributorStats.findMany({
    where: region ? { region } : undefined,
    orderBy: { approvedCount: 'desc' },
    take: Math.min(limit, MAX_LEADERBOARD_LIMIT),
    select: { contributorName: true, region: true, approvedCount: true, lastContributedAt: true },
  });
}

export interface CoverageReport {
  regions: Array<{ region: Region; corpusItemCount: number; wordCount: number; translationCount: number; share: number | null }>;
  levelDistribution: Array<{ unit: string; count: number }>;
  translator: { hitRate: number | null; wordCount: number; sentenceCount: number } | null;
}

export async function getCoverage(prisma: PrismaClient): Promise<CoverageReport> {
  const [regionStats, levelCounts, translatorStats] = await Promise.all([
    prisma.regionStats.findMany(),
    prisma.corpusItem.groupBy({ by: ['unit'], _count: { _all: true } }),
    prisma.translatorStats.findUnique({ where: { id: 1 } }),
  ]);

  const total = regionStats.reduce((sum, r) => sum + r.corpusItemCount, 0);

  return {
    regions: regionStats.map((r) => ({
      region: r.region,
      corpusItemCount: r.corpusItemCount,
      wordCount: r.wordCount,
      translationCount: r.translationCount,
      share: total > 0 ? r.corpusItemCount / total : null,
    })),
    levelDistribution: levelCounts.map((row) => ({ unit: row.unit, count: row._count._all })),
    translator: translatorStats
      ? {
          hitRate: translatorStats.hitRate ? Number(translatorStats.hitRate) : null,
          wordCount: translatorStats.wordCount,
          sentenceCount: translatorStats.sentenceCount,
        }
      : null,
  };
}

export interface GapsReport {
  translatorMisses: Array<{ region: Region; missRate: number }>;
  weakRegions: Array<{ region: Region; share: number }>;
}

export async function getGaps(prisma: PrismaClient): Promise<GapsReport> {
  const [misses, regionStats] = await Promise.all([
    prisma.translatorRegionMiss.findMany({ orderBy: { missRate: 'desc' } }),
    prisma.regionStats.findMany(),
  ]);

  const total = regionStats.reduce((sum, r) => sum + r.corpusItemCount, 0);
  const weakRegions = regionStats
    .map((r) => ({ region: r.region, share: total > 0 ? r.corpusItemCount / total : 0 }))
    .filter((r) => r.share < WEAK_REGION_SHARE_THRESHOLD)
    .sort((a, b) => a.share - b.share);

  return {
    translatorMisses: misses.map((m) => ({ region: m.region, missRate: Number(m.missRate) })),
    weakRegions,
  };
}
