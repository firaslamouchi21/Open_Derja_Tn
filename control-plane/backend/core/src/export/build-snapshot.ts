import type { PrismaClient } from '@open-derja/db';

const PAGE_SIZE = 200;

export interface SnapshotExportRow {
  id: string;
  text: string;
  canonical_form: string | null;
  script: string;
  unit: string;
  dataset_split: string;
  rule_version: number | null;
  document: { source_kind: string; license: string; rights_status: string };
  regions: string[];
  scope: string | null;
  register: string | null;
  era: string | null;
  tokens: Array<{ char_start: number; char_end: number; surface: string; lexicon_variant_id: string | null }>;
  translations: Array<{ target_lang: string; text: string; source: string; is_preferred: boolean }>;
}

export async function* buildSnapshotRows(prisma: PrismaClient): AsyncGenerator<SnapshotExportRow> {
  let cursor: string | undefined;

  for (;;) {
    const items = await prisma.corpusItem.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: {
        document: { include: { source: { select: { kind: true } } } },
        tags: { where: { isMachine: false }, select: { kind: true, value: true } },
        tokens: {
          where: { isMachine: false },
          select: { charStart: true, charEnd: true, surfaceText: true, link: { select: { lexiconVariantId: true } } },
        },
        translations: { select: { targetLang: true, text: true, source: true, isPreferred: true } },
      },
    });
    if (items.length === 0) {
      return;
    }

    for (const item of items) {
      const byKind = (kind: string) => item.tags.filter((t) => t.kind === kind).map((t) => t.value);
      yield {
        id: item.id,
        text: item.text,
        canonical_form: item.canonicalForm,
        script: item.script,
        unit: item.unit,
        dataset_split: item.datasetSplit,
        rule_version: item.ruleVersion,
        document: {
          source_kind: item.document.source.kind,
          license: item.document.license,
          rights_status: item.document.rightsStatus,
        },
        regions: byKind('region'),
        scope: byKind('scope')[0] ?? null,
        register: byKind('register')[0] ?? null,
        era: byKind('era')[0] ?? null,
        tokens: item.tokens.map((t) => ({
          char_start: t.charStart,
          char_end: t.charEnd,
          surface: t.surfaceText,
          lexicon_variant_id: t.link?.lexiconVariantId ?? null,
        })),
        translations: item.translations.map((t) => ({
          target_lang: t.targetLang,
          text: t.text,
          source: t.source,
          is_preferred: t.isPreferred,
        })),
      };
    }

    cursor = items[items.length - 1].id;
  }
}

export async function* buildSnapshotJsonl(prisma: PrismaClient): AsyncGenerator<string> {
  for await (const row of buildSnapshotRows(prisma)) {
    yield `${JSON.stringify(row)}\n`;
  }
}

export async function collectSnapshotJsonl(prisma: PrismaClient): Promise<{ body: string; lines: number }> {
  let body = '';
  let lines = 0;
  for await (const line of buildSnapshotJsonl(prisma)) {
    body += line;
    lines += 1;
  }
  return { body, lines };
}
