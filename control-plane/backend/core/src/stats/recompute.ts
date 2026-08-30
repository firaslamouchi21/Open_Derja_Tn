import type { PrismaClient, Region } from '@open-derja/db';

const REGIONS: Region[] = ['northwest', 'north', 'sahel', 'south'];

export async function recomputeContributorStats(prisma: PrismaClient): Promise<{ sessions: number }> {
  const submissions = await prisma.submissionMeta.findMany({
    where: { sessionId: { not: null } },
    select: {
      sessionId: true,
      contributorName: true,
      selfReportedRegion: true,
      createdAt: true,
      corpusItem: {
        select: { tasks: { where: { type: 'review' }, select: { status: true } } },
      },
    },
  });

  const bySession = new Map<
    string,
    { name: string | null; region: Region | null; submitted: number; approved: number; rejected: number; last: Date }
  >();

  for (const row of submissions) {
    const key = row.sessionId as string;
    const entry = bySession.get(key) ?? {
      name: row.contributorName,
      region: row.selfReportedRegion,
      submitted: 0,
      approved: 0,
      rejected: 0,
      last: row.createdAt,
    };
    entry.submitted += 1;
    if (row.createdAt > entry.last) {
      entry.last = row.createdAt;
    }
    for (const task of row.corpusItem?.tasks ?? []) {
      if (task.status === 'done') entry.approved += 1;
      if (task.status === 'rejected') entry.rejected += 1;
    }
    bySession.set(key, entry);
  }

  const now = new Date();
  for (const [sessionId, entry] of bySession) {
    await prisma.contributorStats.upsert({
      where: { sessionId },
      create: {
        sessionId,
        contributorName: entry.name,
        region: entry.region,
        submittedCount: entry.submitted,
        approvedCount: entry.approved,
        rejectedCount: entry.rejected,
        lastContributedAt: entry.last,
        computedAt: now,
      },
      update: {
        contributorName: entry.name,
        region: entry.region,
        submittedCount: entry.submitted,
        approvedCount: entry.approved,
        rejectedCount: entry.rejected,
        lastContributedAt: entry.last,
        computedAt: now,
      },
    });
  }

  return { sessions: bySession.size };
}

export async function recomputeRegionStats(prisma: PrismaClient): Promise<{ regions: number }> {
  const now = new Date();

  for (const region of REGIONS) {
    const regionTags = await prisma.tag.findMany({
      where: { kind: 'region', value: region, isMachine: false },
      distinct: ['corpusItemId'],
      select: { corpusItemId: true },
    });
    const corpusItemIds = regionTags.map((t) => t.corpusItemId);

    const [translationCount, reviewerCount, adjudications] = await Promise.all([
      prisma.translation.count({ where: { corpusItemId: { in: corpusItemIds } } }),
      prisma.user.count({ where: { role: 'reviewer', regionSelfReported: region } }),
      prisma.task.findMany({
        where: { type: 'adjudicate', status: 'done', targetRegions: { has: region } },
        select: { completer: { select: { regionSelfReported: true } } },
      }),
    ]);

    const outOfRegion = adjudications.filter((a) => a.completer?.regionSelfReported !== region).length;
    const outOfRegionRate = adjudications.length > 0 ? outOfRegion / adjudications.length : null;

    await prisma.regionStats.upsert({
      where: { region },
      create: {
        region,
        corpusItemCount: corpusItemIds.length,
        wordCount: 0,
        translationCount,
        reviewerCount,
        outOfRegionAdjudicationRate: outOfRegionRate,
        computedAt: now,
      },
      update: {
        corpusItemCount: corpusItemIds.length,
        translationCount,
        reviewerCount,
        outOfRegionAdjudicationRate: outOfRegionRate,
        computedAt: now,
      },
    });
  }

  return { regions: REGIONS.length };
}

export async function recomputeTranslatorStats(
  prisma: PrismaClient,
  options: { windowDays?: number } = {},
): Promise<{ lookups: number }> {
  const since = new Date(Date.now() - (options.windowDays ?? 30) * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [wordCount, sentenceCount, total, hits] = await Promise.all([
    prisma.lexiconVariant.count(),
    prisma.corpusItem.count({ where: { unit: 'sentence' } }),
    prisma.translatorLookup.count({ where: { createdAt: { gte: since } } }),
    prisma.translatorLookup.count({ where: { createdAt: { gte: since }, hit: true } }),
  ]);
  const hitRate = total > 0 ? hits / total : null;

  await prisma.translatorStats.upsert({
    where: { id: 1 },
    create: { id: 1, wordCount, sentenceCount, hitRate, computedAt: now },
    update: { wordCount, sentenceCount, hitRate, computedAt: now },
  });

  for (const region of REGIONS) {
    const [regionTotal, regionMiss] = await Promise.all([
      prisma.translatorLookup.count({ where: { createdAt: { gte: since }, region } }),
      prisma.translatorLookup.count({ where: { createdAt: { gte: since }, region, hit: false } }),
    ]);
    const missRate = regionTotal > 0 ? regionMiss / regionTotal : 0;
    await prisma.translatorRegionMiss.upsert({
      where: { region },
      create: { region, missRate, computedAt: now },
      update: { missRate, computedAt: now },
    });
  }

  return { lookups: total };
}

export async function recomputeAllStats(prisma: PrismaClient): Promise<void> {
  await recomputeContributorStats(prisma);
  await recomputeRegionStats(prisma);
  await recomputeTranslatorStats(prisma);
}
