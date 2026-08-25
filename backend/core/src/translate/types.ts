import type { Prisma, Region } from '@open-derja/db';

export const LEXICON_VARIANT_INCLUDE = {
  lexiconEntry: true,
  regions: true,
  forms: true,
  translations: { where: { isPreferred: true } },
} satisfies Prisma.LexiconVariantInclude;

export type VariantDetail = Prisma.LexiconVariantGetPayload<{ include: typeof LEXICON_VARIANT_INCLUDE }>;

export const SENTENCE_SELECT = {
  id: true,
  text: true,
  script: true,
  canonicalForm: true,
  translations: { where: { isPreferred: true } },
} satisfies Prisma.CorpusItemSelect;

export type SentenceDetail = Prisma.CorpusItemGetPayload<{ select: typeof SENTENCE_SELECT }>;

export interface TranslateLookupResult {
  query: string;
  matchKey: string;
  exact: VariantDetail[];
  fuzzy: Array<{ variant: VariantDetail; similarity: number }>;
  sentences: Array<{ item: SentenceDetail; similarity: number }>;
  missingRegions: Region[];
}

export interface TranslateCoverageResult {
  wordCount: number;
  sentenceCount: number;
}
