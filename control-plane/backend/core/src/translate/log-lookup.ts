import type { Prisma, PrismaClient, Region } from '@open-derja/db';
import type { TranslateLookupResult } from './types';

export function isLookupHit(result: TranslateLookupResult): boolean {
  return result.exact.length > 0 || result.fuzzy.length > 0;
}

export function logTranslatorLookup(
  client: PrismaClient | Prisma.TransactionClient,
  params: { queryText: string; matchKey: string; region?: Region; hit: boolean },
): Promise<unknown> {
  return client.translatorLookup.create({
    data: {
      queryText: params.queryText.slice(0, 500),
      matchKey: params.matchKey,
      region: params.region,
      hit: params.hit,
    },
  });
}
