import { Prisma } from '@open-derja/db';
import type { PrismaClient, Region } from '@open-derja/db';
import { computeMatchKey } from '../text/match-key';
import { corpusItemVulgarExclusionSql, lexiconVariantVulgarFilter } from '../policy/vulgar-register';
import { LEXICON_VARIANT_INCLUDE, SENTENCE_SELECT, type TranslateLookupResult } from './types';

const FUZZY_SIMILARITY_THRESHOLD = 0.3;
const FUZZY_LIMIT = 10;
const SENTENCE_LIMIT = 5;
const ALL_REGIONS: Region[] = ['northwest', 'north', 'sahel', 'south'];

export async function lookupTranslation(
  client: PrismaClient | Prisma.TransactionClient,
  text: string,
  region?: Region,
  includeVulgar = false,
): Promise<TranslateLookupResult> {
  const matchKey = computeMatchKey(text);
  const vulgarFilter = lexiconVariantVulgarFilter(includeVulgar);

  const exactVariants = await client.lexiconVariant.findMany({
    where: {
      OR: [{ matchKey }, { forms: { some: { matchKey } } }],
      ...(region ? { regions: { some: { region } } } : {}),
      ...vulgarFilter,
    },
    include: LEXICON_VARIANT_INCLUDE,
  });
  const exactIds = new Set(exactVariants.map((v) => v.id));

  const fuzzyRows = await client.$queryRaw<Array<{ id: string; similarity: number }>>(
    Prisma.sql`
      SELECT id, similarity(match_key, ${matchKey}) AS similarity
      FROM lexicon_variants
      WHERE match_key % ${matchKey}
      ORDER BY similarity DESC
      LIMIT ${FUZZY_LIMIT}
    `,
  );
  const fuzzyIds = fuzzyRows.map((r) => r.id).filter((id) => !exactIds.has(id));
  const fuzzyVariants = fuzzyIds.length
    ? await client.lexiconVariant.findMany({
        where: {
          id: { in: fuzzyIds },
          ...(region ? { regions: { some: { region } } } : {}),
          ...vulgarFilter,
        },
        include: LEXICON_VARIANT_INCLUDE,
      })
    : [];
  const similarityById = new Map(fuzzyRows.map((r) => [r.id, r.similarity]));
  const fuzzy = fuzzyVariants
    .map((variant) => ({ variant, similarity: similarityById.get(variant.id) ?? 0 }))
    .filter((row) => row.similarity >= FUZZY_SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);

  const vulgarExclusionSql = corpusItemVulgarExclusionSql(includeVulgar);
  const sentenceRows = await client.$queryRaw<Array<{ id: string; similarity: number }>>(
    Prisma.sql`
      SELECT id, similarity(match_key, ${matchKey}) AS similarity
      FROM corpus_items
      WHERE match_key % ${matchKey}
      ${vulgarExclusionSql}
      ORDER BY similarity DESC
      LIMIT ${SENTENCE_LIMIT}
    `,
  );
  const sentenceIds = sentenceRows.map((r) => r.id);
  const sentenceItems = sentenceIds.length
    ? await client.corpusItem.findMany({
        where: { id: { in: sentenceIds } },
        select: SENTENCE_SELECT,
      })
    : [];
  const sentenceSimilarityById = new Map(sentenceRows.map((r) => [r.id, r.similarity]));
  const sentences = sentenceItems
    .map((item) => ({ item, similarity: sentenceSimilarityById.get(item.id) ?? 0 }))
    .sort((a, b) => b.similarity - a.similarity);

  const attestedRegions = new Set(
    [...exactVariants, ...fuzzy.map((f) => f.variant)].flatMap((v) => v.regions.map((r) => r.region)),
  );
  const missingRegions = ALL_REGIONS.filter((r) => !attestedRegions.has(r));

  return {
    query: text,
    matchKey,
    exact: exactVariants,
    fuzzy,
    sentences,
    missingRegions,
  };
}
