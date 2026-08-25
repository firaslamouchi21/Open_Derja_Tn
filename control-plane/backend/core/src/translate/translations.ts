import type { Prisma, PrismaClient, TargetLang, Translation } from '@open-derja/db';

export interface CreateTranslationParams {
  corpusItemId: string;
  targetLang: TargetLang;
  text: string;
  translatorId: string;
  isMachine: boolean;
}

export function createTranslation(
  client: PrismaClient | Prisma.TransactionClient,
  params: CreateTranslationParams,
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
