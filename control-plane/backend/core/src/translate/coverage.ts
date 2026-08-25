import type { Prisma, PrismaClient } from '@open-derja/db';
import type { TranslateCoverageResult } from './types';

export async function getTranslatorCoverage(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<TranslateCoverageResult> {
  const [wordCount, sentenceCount] = await Promise.all([
    client.lexiconVariant.count(),
    client.corpusItem.count({ where: { unit: 'sentence' } }),
  ]);
  return { wordCount, sentenceCount };
}
