import { PrismaClient } from '@prisma/client';
import { STANDARDISATION_RULE_SEEDS, STANDARDISATION_RULE_VERSION } from './standardisation-rules.data';

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const seed of STANDARDISATION_RULE_SEEDS) {
      const existing = await prisma.standardisationRule.findFirst({
        where: { ruleVersion: STANDARDISATION_RULE_VERSION, pattern: seed.pattern },
      });
      if (existing) {
        await prisma.standardisationRule.update({
          where: { id: existing.id },
          data: { replacement: seed.replacement, description: seed.description, active: true },
        });
      } else {
        await prisma.standardisationRule.create({
          data: {
            ruleVersion: STANDARDISATION_RULE_VERSION,
            pattern: seed.pattern,
            replacement: seed.replacement,
            script: seed.script,
            description: seed.description,
          },
        });
      }
    }
    console.log(
      `[seed:standardisation-rules] upserted ${STANDARDISATION_RULE_SEEDS.length} rules at rule_version ${STANDARDISATION_RULE_VERSION}`,
    );
    if (STANDARDISATION_RULE_SEEDS.length === 0) {
      console.log(
        '[seed:standardisation-rules] the seed list is empty — this script runs safely but seeds nothing yet. ' +
          'Real CODA-TUN rule content (pattern/replacement pairs) needs someone with the linguistic background ' +
          'to write it into standardisation-rules.data.ts; it was deliberately not invented here.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed:standardisation-rules] failed', error);
  process.exit(1);
});
