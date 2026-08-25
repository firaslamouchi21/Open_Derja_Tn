import type PgBoss from 'pg-boss';
import { PrismaClient } from '@open-derja/db';
import { releaseExpiredClaims } from '@open-derja/core';

export const EXPIRE_CLAIMS_QUEUE = 'expire-claims';
export const EXPIRE_CLAIMS_CRON = '*/5 * * * *';

export async function registerExpireClaimsJob(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  await boss.createQueue(EXPIRE_CLAIMS_QUEUE);
  await boss.schedule(EXPIRE_CLAIMS_QUEUE, EXPIRE_CLAIMS_CRON);

  await boss.work(EXPIRE_CLAIMS_QUEUE, async () => {
    const { released } = await releaseExpiredClaims(prisma);
    if (released > 0) {
      console.log(`[expire-claims] released ${released} stale claim(s)`);
    }
  });
}
