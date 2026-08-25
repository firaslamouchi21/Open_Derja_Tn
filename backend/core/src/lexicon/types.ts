import type { Prisma } from '@open-derja/db';

export const LEXICON_ENTRY_INCLUDE = {
  variants: {
    include: {
      regions: true,
      forms: true,
    },
  },
  origins: true,
} satisfies Prisma.LexiconEntryInclude;

export type LexiconEntryDetail = Prisma.LexiconEntryGetPayload<{ include: typeof LEXICON_ENTRY_INCLUDE }>;

export interface LexiconSearchResult {
  items: LexiconEntryDetail[];
  total: number;
  page: number;
  pageSize: number;
}
