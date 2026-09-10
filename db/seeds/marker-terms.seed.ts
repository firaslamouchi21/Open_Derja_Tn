import { PrismaClient } from '@prisma/client';
import { MARKER_TERM_LIST_VERSION, MARKER_TERM_SEEDS } from './marker-terms.data';

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const seed of MARKER_TERM_SEEDS) {
      await prisma.markerTerm.upsert({
        where: { term_listVersion: { term: seed.term, listVersion: MARKER_TERM_LIST_VERSION } },
        create: { term: seed.term, listVersion: MARKER_TERM_LIST_VERSION, notes: seed.notes },
        update: { notes: seed.notes, active: true },
      });
    }
    console.log(`[seed:markers] upserted ${MARKER_TERM_SEEDS.length} marker terms at list_version ${MARKER_TERM_LIST_VERSION}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed:markers] failed', error);
  process.exit(1);
});
