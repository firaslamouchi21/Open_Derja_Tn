import type PgBoss from 'pg-boss';
import { PrismaClient } from '@open-derja/db';
import { runActiveSources } from '@open-derja/scrapers';

export const RUN_SCRAPERS_QUEUE = 'run-scrapers';
const RUN_SCRAPERS_CRON = '0 */6 * * *';

export async function registerRunScrapersJob(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  await boss.createQueue(RUN_SCRAPERS_QUEUE);
  await boss.schedule(RUN_SCRAPERS_QUEUE, RUN_SCRAPERS_CRON);

  await boss.work(RUN_SCRAPERS_QUEUE, async () => {
    const results = await runActiveSources(prisma);
    for (const result of results) {
      if (result.outcome === 'ran') {
        console.log(`[run-scrapers] ${result.sourceName}: ${result.result?.documentsIngested ?? 0} document(s) ingested`);
      } else if (result.outcome === 'failed') {
        console.error(`[run-scrapers] ${result.sourceName}: failed — ${result.error}`);
      }
    }
  });
}
