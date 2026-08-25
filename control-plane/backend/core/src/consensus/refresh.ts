import type { Prisma, PrismaClient, TagKind } from '@open-derja/db';
import { computeAgreement, type ConsensusResult } from './agreement';

export interface RefreshConsensusParams {
  corpusItemId: string;
  kind: TagKind;
  charStart: number;
  charEnd: number;
}

export async function refreshConsensus(
  client: PrismaClient | Prisma.TransactionClient,
  params: RefreshConsensusParams,
): Promise<ConsensusResult> {
  const tags = await client.tag.findMany({
    where: {
      corpusItemId: params.corpusItemId,
      kind: params.kind,
      charStart: params.charStart,
      charEnd: params.charEnd,
      isMachine: false,
    },
    select: { annotatorId: true, value: true },
  });

  const annotatorValues = new Map<string, Set<string>>();
  for (const tag of tags) {
    const set = annotatorValues.get(tag.annotatorId) ?? new Set<string>();
    set.add(tag.value);
    annotatorValues.set(tag.annotatorId, set);
  }

  const result = computeAgreement(annotatorValues);
  const key = {
    corpusItemId: params.corpusItemId,
    kind: params.kind,
    charStart: params.charStart,
    charEnd: params.charEnd,
  };

  await client.tagConsensus.upsert({
    where: { corpusItemId_kind_charStart_charEnd: key },
    create: {
      ...key,
      agreedValues: result.agreedValues,
      agreement: result.agreement,
      annotatorN: result.annotatorN,
      needsAdjudication: result.needsAdjudication,
      computedAt: new Date(),
    },
    update: {
      agreedValues: result.agreedValues,
      agreement: result.agreement,
      annotatorN: result.annotatorN,
      needsAdjudication: result.needsAdjudication,
      computedAt: new Date(),
    },
  });

  return result;
}
