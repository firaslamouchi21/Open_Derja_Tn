import type PgBoss from 'pg-boss';
import { PrismaClient } from '@open-derja/db';
import { processPendingRevocations } from '@open-derja/core';

export const ANONYMISE_REVOKED_QUEUE = 'anonymise-revoked';
const ANONYMISE_CRON = '23 * * * *';

export async function registerAnonymiseRevokedJob(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  await boss.createQueue(ANONYMISE_REVOKED_QUEUE);
  await boss.schedule(ANONYMISE_REVOKED_QUEUE, ANONYMISE_CRON);

  await boss.work(ANONYMISE_REVOKED_QUEUE, async () => {
    const { processed } = await processPendingRevocations(prisma);
    if (processed > 0) {
      console.log(`[anonymise-revoked] processed ${processed} revocation(s)`);
    }
  });
}
