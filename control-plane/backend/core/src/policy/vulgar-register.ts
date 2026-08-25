import { Prisma } from '@open-derja/db';

export function lexiconVariantVulgarFilter(includeVulgar: boolean): Prisma.LexiconVariantWhereInput {
  return includeVulgar ? {} : { register: { not: 'vulgar' } };
}

export function corpusItemVulgarExclusionSql(includeVulgar: boolean): Prisma.Sql {
  if (includeVulgar) {
    return Prisma.empty;
  }
  return Prisma.sql`AND NOT EXISTS (
    SELECT 1 FROM tags
    WHERE tags.corpus_item_id = corpus_items.id
      AND tags.kind = 'register'
      AND tags.value = 'vulgar'
  )`;
}
