import 'dotenv/config';
import { PrismaClient } from '@open-derja/db';
import { runActiveSources } from './pipeline/run-active-sources';

async function main() {
  const prisma = new PrismaClient();
  try {
    const results = await runActiveSources(prisma);
    for (const result of results) {
      if (result.outcome === 'ran') {
        console.log(`[scrapers] ${result.sourceName}: ${result.result?.documentsIngested ?? 0} document(s) ingested`);
      } else {
        console.error(`[scrapers] ${result.sourceName}: failed — ${result.error}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[scrapers] fatal error', error);
  process.exit(1);
});
