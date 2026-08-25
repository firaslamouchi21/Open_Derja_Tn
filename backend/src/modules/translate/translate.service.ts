import { Injectable } from '@nestjs/common';
import { computeMatchKey } from '@open-derja/core';
import { Prisma } from '@open-derja/db';
import type { Region, TargetLang, Translation } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';

const FUZZY_SIMILARITY_THRESHOLD = 0.3;
const FUZZY_LIMIT = 10;
const SENTENCE_LIMIT = 5;

const VARIANT_INCLUDE = {
  lexiconEntry: true,
  regions: true,
  forms: true,
  translations: { where: { isPreferred: true } },
} satisfies Prisma.LexiconVariantInclude;

export type VariantDetail = Prisma.LexiconVariantGetPayload<{ include: typeof VARIANT_INCLUDE }>;

const SENTENCE_SELECT = {
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

@Injectable()
export class TranslateService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(text: string, region?: Region): Promise<TranslateLookupResult> {
    const matchKey = computeMatchKey(text);

    const exactVariants = await this.prisma.lexiconVariant.findMany({
      where: {
        OR: [{ matchKey }, { forms: { some: { matchKey } } }],
        ...(region ? { regions: { some: { region } } } : {}),
      },
      include: VARIANT_INCLUDE,
    });
    const exactIds = new Set(exactVariants.map((v) => v.id));

    const fuzzyRows = await this.prisma.$queryRaw<Array<{ id: string; similarity: number }>>(
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
      ? await this.prisma.lexiconVariant.findMany({
          where: {
            id: { in: fuzzyIds },
            ...(region ? { regions: { some: { region } } } : {}),
          },
          include: VARIANT_INCLUDE,
        })
      : [];
    const similarityById = new Map(fuzzyRows.map((r) => [r.id, r.similarity]));
    const fuzzy = fuzzyVariants
      .map((variant) => ({ variant, similarity: similarityById.get(variant.id) ?? 0 }))
      .filter((row) => row.similarity >= FUZZY_SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity);

    const sentenceRows = await this.prisma.$queryRaw<Array<{ id: string; similarity: number }>>(
      Prisma.sql`
        SELECT id, similarity(match_key, ${matchKey}) AS similarity
        FROM corpus_items
        WHERE match_key % ${matchKey}
        ORDER BY similarity DESC
        LIMIT ${SENTENCE_LIMIT}
      `,
    );
    const sentenceIds = sentenceRows.map((r) => r.id);
    const sentenceItems = sentenceIds.length
      ? await this.prisma.corpusItem.findMany({
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
    const missingRegions = (['northwest', 'north', 'sahel', 'south'] as Region[]).filter(
      (r) => !attestedRegions.has(r),
    );

    return {
      query: text,
      matchKey,
      exact: exactVariants,
      fuzzy,
      sentences,
      missingRegions,
    };
  }

  createTranslation(
    params: {
      corpusItemId: string;
      targetLang: TargetLang;
      text: string;
      translatorId: string;
      isMachine: boolean;
    },
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<Translation> {
    return client.translation.create({
      data: {
        corpusItemId: params.corpusItemId,
        targetLang: params.targetLang,
        text: params.text,
        source: params.isMachine ? 'llm_draft' : 'human',
        translatorId: params.translatorId,
        isPreferred: !params.isMachine,
      },
    });
  }

  async coverage(): Promise<TranslateCoverageResult> {
    const [wordCount, sentenceCount] = await this.prisma.$transaction([
      this.prisma.lexiconVariant.count(),
      this.prisma.corpusItem.count({ where: { unit: 'sentence' } }),
    ]);
    return { wordCount, sentenceCount };
  }
}
