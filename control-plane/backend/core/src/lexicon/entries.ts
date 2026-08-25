import type { Domain, Granularity, LexiconEntry, PartOfSpeech, Prisma, PrismaClient } from '@open-derja/db';
import { LEXICON_ENTRY_INCLUDE, type LexiconEntryDetail, type LexiconSearchResult } from './types';

export async function searchLexiconEntries(
  client: PrismaClient | Prisma.TransactionClient,
  q: string | undefined,
  limit = 20,
): Promise<LexiconSearchResult> {
  const where: Prisma.LexiconEntryWhereInput | undefined = q
    ? {
        OR: [
          { glossEn: { contains: q, mode: 'insensitive' } },
          { glossFr: { contains: q, mode: 'insensitive' } },
          { glossMsa: { contains: q, mode: 'insensitive' } },
          { variants: { some: { canonicalForm: { contains: q, mode: 'insensitive' } } } },
        ],
      }
    : undefined;

  const [items, total] = await Promise.all([
    client.lexiconEntry.findMany({
      where,
      include: LEXICON_ENTRY_INCLUDE,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    client.lexiconEntry.count({ where }),
  ]);

  return { items, total, page: 1, pageSize: limit };
}

export function findLexiconEntry(
  client: PrismaClient | Prisma.TransactionClient,
  id: string,
): Promise<LexiconEntryDetail | null> {
  return client.lexiconEntry.findUnique({ where: { id }, include: LEXICON_ENTRY_INCLUDE });
}

export function lexiconEntryExists(client: PrismaClient | Prisma.TransactionClient, id: string): Promise<boolean> {
  return client.lexiconEntry.findUnique({ where: { id }, select: { id: true } }).then((row) => row !== null);
}

export interface CreateLexiconEntryParams {
  glossEn?: string;
  glossFr?: string;
  glossMsa?: string;
  domain?: Domain;
  granularity: Granularity;
  pos?: PartOfSpeech;
  notes?: string;
}

export function createLexiconEntry(
  client: PrismaClient | Prisma.TransactionClient,
  params: CreateLexiconEntryParams,
): Promise<LexiconEntry> {
  return client.lexiconEntry.create({ data: params });
}
