import type { LexiconForm, Prisma, PrismaClient, Script } from '@open-derja/db';
import { computeMatchKey } from '../text/match-key';
import { lexiconVariantExists } from './variants';

export interface CreateLexiconFormParams {
  text: string;
  script: Script;
  isMachine: boolean;
}

export async function createLexiconForm(
  client: PrismaClient | Prisma.TransactionClient,
  variantId: string,
  params: CreateLexiconFormParams,
): Promise<LexiconForm | null> {
  if (!(await lexiconVariantExists(client, variantId))) {
    return null;
  }
  return client.lexiconForm.create({
    data: {
      lexiconVariantId: variantId,
      text: params.text,
      script: params.script,
      matchKey: computeMatchKey(params.text),
      isCanonical: !params.isMachine,
    },
  });
}
