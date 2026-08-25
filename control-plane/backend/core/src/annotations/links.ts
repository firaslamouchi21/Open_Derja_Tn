import type { Link, Prisma, PrismaClient } from '@open-derja/db';

export interface AddLinkParams {
  tokenId: string;
  lexiconEntryId: string;
  lexiconVariantId?: string;
  annotatorId: string;
  isMachine: boolean;
  confidence?: number;
}

export function addLink(client: PrismaClient | Prisma.TransactionClient, params: AddLinkParams): Promise<Link> {
  return client.link.create({
    data: {
      tokenId: params.tokenId,
      lexiconEntryId: params.lexiconEntryId,
      lexiconVariantId: params.lexiconVariantId,
      annotatorId: params.annotatorId,
      isMachine: params.isMachine,
      confidence: params.confidence,
    },
  });
}
