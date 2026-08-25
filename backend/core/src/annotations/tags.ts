import type { Prisma, PrismaClient, Region, Tag, TagKind } from '@open-derja/db';

export interface AddTagParams {
  corpusItemId: string;
  kind: TagKind;
  value: string;
  charStart: number;
  charEnd: number;
  annotatorId: string;
  isMachine: boolean;
  confidence?: number;
}

export function addTag(client: PrismaClient | Prisma.TransactionClient, params: AddTagParams): Promise<Tag> {
  return client.tag.create({
    data: {
      corpusItemId: params.corpusItemId,
      kind: params.kind,
      value: params.value,
      charStart: params.charStart,
      charEnd: params.charEnd,
      annotatorId: params.annotatorId,
      isMachine: params.isMachine,
      confidence: params.confidence,
    },
  });
}

export function addFullSpanTag(
  client: PrismaClient | Prisma.TransactionClient,
  params: Omit<AddTagParams, 'charStart' | 'charEnd'> & { textLength: number },
): Promise<Tag> {
  return addTag(client, { ...params, charStart: 0, charEnd: params.textLength });
}

export interface AddRegionTagsParams {
  corpusItemId: string;
  regions: Region[];
  textLength: number;
  annotatorId: string;
  isMachine: boolean;
}

export async function addRegionTags(
  client: PrismaClient | Prisma.TransactionClient,
  params: AddRegionTagsParams,
): Promise<Tag[]> {
  const rows: Tag[] = [];
  for (const region of params.regions) {
    rows.push(
      await addFullSpanTag(client, {
        corpusItemId: params.corpusItemId,
        kind: 'region',
        value: region,
        textLength: params.textLength,
        annotatorId: params.annotatorId,
        isMachine: params.isMachine,
      }),
    );
  }
  return rows;
}
