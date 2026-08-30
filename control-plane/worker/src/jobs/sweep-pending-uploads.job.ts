import type PgBoss from 'pg-boss';
import { PrismaClient } from '@open-derja/db';
import { createStorageProvider, sweepPendingUploads, type StorageEnv } from '@open-derja/core';

export const SWEEP_PENDING_UPLOADS_QUEUE = 'sweep-pending-uploads';
const SWEEP_CRON = '17 * * * *';

export async function registerSweepPendingUploadsJob(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  await boss.createQueue(SWEEP_PENDING_UPLOADS_QUEUE);
  await boss.schedule(SWEEP_PENDING_UPLOADS_QUEUE, SWEEP_CRON);

  await boss.work(SWEEP_PENDING_UPLOADS_QUEUE, async () => {
    const provider = createStorageProvider(process.env as unknown as StorageEnv);
    const { confirmed, deleted } = await sweepPendingUploads(prisma, provider);
    if (confirmed > 0 || deleted > 0) {
      console.log(`[sweep-pending-uploads] confirmed ${confirmed}, abandoned ${deleted}`);
    }
  });
}
