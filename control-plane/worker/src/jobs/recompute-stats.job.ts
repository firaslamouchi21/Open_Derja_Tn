import type PgBoss from 'pg-boss';
import { PrismaClient } from '@open-derja/db';
import { recomputeAllStats, recomputeTrustLevels } from '@open-derja/core';

export const RECOMPUTE_STATS_QUEUE = 'recompute-stats';
const RECOMPUTE_CRON = '30 3 * * *';

export async function registerRecomputeStatsJob(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  await boss.createQueue(RECOMPUTE_STATS_QUEUE);
  await boss.schedule(RECOMPUTE_STATS_QUEUE, RECOMPUTE_CRON);

  await boss.work(RECOMPUTE_STATS_QUEUE, async () => {
    await recomputeAllStats(prisma);
    const { updated } = await recomputeTrustLevels(prisma);
    console.log(`[recompute-stats] stats refreshed, ${updated} trust level(s) changed`);
  });
}
