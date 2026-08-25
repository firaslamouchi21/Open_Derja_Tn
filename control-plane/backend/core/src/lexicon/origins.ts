import type { LexiconOrigin, OriginLayer, Prisma, PrismaClient } from '@open-derja/db';
import { lexiconEntryExists } from './entries';

export interface AddLexiconOriginParams {
  origin: OriginLayer;
  sourceForm?: string;
  sourceLang?: string;
  note?: string;
  proposedBy?: string;
  sessionId?: string;
  ipHash?: string;
}

export async function addLexiconOrigin(
  client: PrismaClient | Prisma.TransactionClient,
  entryId: string,
  params: AddLexiconOriginParams,
): Promise<LexiconOrigin | null> {
  if (!(await lexiconEntryExists(client, entryId))) {
    return null;
  }
  return client.lexiconOrigin.create({
    data: {
      lexiconEntryId: entryId,
      origin: params.origin,
      sourceForm: params.sourceForm,
      sourceLang: params.sourceLang,
      note: params.note,
      proposedBy: params.proposedBy,
      sessionId: params.sessionId,
      ipHash: params.ipHash,
      status: 'proposed',
    },
  });
}
