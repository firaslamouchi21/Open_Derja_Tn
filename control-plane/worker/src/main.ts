import 'dotenv/config';
import { PrismaClient } from '@open-derja/db';
import {
  getBoss,
  registerAnonymiseRevokedJob,
  registerDispatchOutboxJob,
  registerExpireClaimsJob,
  registerRecomputeStatsJob,
  registerRunScrapersJob,
  registerSweepPendingUploadsJob,
} from './jobs';

async function main() {
  const prisma = new PrismaClient();
  const boss = getBoss();

  await boss.start();
  await registerExpireClaimsJob(boss, prisma);
  await registerDispatchOutboxJob(boss, prisma);
  await registerSweepPendingUploadsJob(boss, prisma);
  await registerAnonymiseRevokedJob(boss, prisma);
  await registerRecomputeStatsJob(boss, prisma);
  await registerRunScrapersJob(boss, prisma);

  console.log('[worker] started, jobs registered');

  const shutdown = async () => {
    console.log('[worker] shutting down...');
    await boss.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('[worker] fatal error', error);
  process.exit(1);
});
