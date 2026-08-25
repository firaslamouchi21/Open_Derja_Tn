import type { Prisma, PrismaClient, Token } from '@open-derja/db';

export interface AddTokenParams {
  corpusItemId: string;
  charStart: number;
  charEnd: number;
  surfaceText: string;
  annotatorId: string;
  isMachine: boolean;
  confidence?: number;
}

export function addToken(client: PrismaClient | Prisma.TransactionClient, params: AddTokenParams): Promise<Token> {
  return client.token.create({
    data: {
      corpusItemId: params.corpusItemId,
      charStart: params.charStart,
      charEnd: params.charEnd,
      surfaceText: params.surfaceText,
      annotatorId: params.annotatorId,
      isMachine: params.isMachine,
      confidence: params.confidence,
    },
  });
}
