import type { Era, LexiconVariant, LexiconVariantRegion, Prisma, PrismaClient, Region, Register, Scope, Setting } from '@open-derja/db';
import { computeMatchKey } from '../text/match-key';
import { lexiconEntryExists } from './entries';

export interface CreateLexiconVariantParams {
  scope: Scope;
  era: Era;
  setting: Setting;
  register: Register;
  canonicalForm: string;
}

export async function createLexiconVariant(
  client: PrismaClient | Prisma.TransactionClient,
  entryId: string,
  params: CreateLexiconVariantParams,
): Promise<LexiconVariant | null> {
  if (!(await lexiconEntryExists(client, entryId))) {
    return null;
  }
  return client.lexiconVariant.create({
    data: {
      lexiconEntryId: entryId,
      scope: params.scope,
      era: params.era,
      setting: params.setting,
      register: params.register,
      canonicalForm: params.canonicalForm,
      matchKey: computeMatchKey(params.canonicalForm),
    },
  });
}

export function lexiconVariantExists(client: PrismaClient | Prisma.TransactionClient, id: string): Promise<boolean> {
  return client.lexiconVariant.findUnique({ where: { id }, select: { id: true } }).then((row) => row !== null);
}

export async function attestLexiconVariantRegion(
  client: PrismaClient | Prisma.TransactionClient,
  variantId: string,
  region: Region,
): Promise<LexiconVariantRegion | null> {
  if (!(await lexiconVariantExists(client, variantId))) {
    return null;
  }
  return client.lexiconVariantRegion.upsert({
    where: { lexiconVariantId_region: { lexiconVariantId: variantId, region } },
    create: { lexiconVariantId: variantId, region, attestationCount: 1 },
    update: { attestationCount: { increment: 1 } },
  });
}
