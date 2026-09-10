import type { PrismaClient, Source } from '@open-derja/db';
import { ingestDocument, loadActiveMarkerTerms, writeAuditLog, type SourceRunner } from '@open-derja/core';
import { SourceRunFailedError } from './source-run-failed-error';

const MAX_ITEMS_PER_RUN = 200;
const CONSECUTIVE_FAILURES_BEFORE_DISABLE = 2;
const SOURCE_ENTITY_TYPE = 'source';
const SCRAPE_RUN_SUCCEEDED = 'scrape_run_succeeded';
const SCRAPE_RUN_FAILED = 'scrape_run_failed';
const SCRAPE_SOURCE_DISABLED = 'scrape_source_disabled';

export interface RunSourceResult {
  documentsIngested: number;
  corpusItemsInserted: number;
  nearDuplicatesSkipped: number;
}

async function countConsecutiveFailures(prisma: PrismaClient, sourceId: string): Promise<number> {
  const recentRuns = await prisma.auditLog.findMany({
    where: { entityType: SOURCE_ENTITY_TYPE, entityId: sourceId, action: { in: [SCRAPE_RUN_FAILED, SCRAPE_RUN_SUCCEEDED] } },
    orderBy: { createdAt: 'desc' },
    take: CONSECUTIVE_FAILURES_BEFORE_DISABLE,
  });

  let streak = 0;
  for (const run of recentRuns) {
    if (run.action !== SCRAPE_RUN_FAILED) break;
    streak += 1;
  }
  return streak;
}

export async function runSource(prisma: PrismaClient, source: Source, runner: SourceRunner): Promise<RunSourceResult> {
  const markers = await loadActiveMarkerTerms(prisma);

  let documentsIngested = 0;
  let corpusItemsInserted = 0;
  let nearDuplicatesSkipped = 0;

  try {
    for await (const item of runner.fetch(source.lastRunAt ?? undefined)) {
      const result = await ingestDocument(prisma, source, item, markers, process.env.DATA_PLANE_URL);
      documentsIngested += 1;
      corpusItemsInserted += result.corpusItemIds.length;
      nearDuplicatesSkipped += result.nearDuplicatesSkipped;
      if (documentsIngested >= MAX_ITEMS_PER_RUN) break;
    }

    await prisma.source.update({ where: { id: source.id }, data: { lastRunAt: new Date() } });
    await writeAuditLog(prisma, {
      action: SCRAPE_RUN_SUCCEEDED,
      entityType: SOURCE_ENTITY_TYPE,
      entityId: source.id,
      diff: { documentsIngested, corpusItemsInserted, nearDuplicatesSkipped },
    });

    return { documentsIngested, corpusItemsInserted, nearDuplicatesSkipped };
  } catch (error) {
    await writeAuditLog(prisma, {
      action: SCRAPE_RUN_FAILED,
      entityType: SOURCE_ENTITY_TYPE,
      entityId: source.id,
      diff: { error: error instanceof Error ? error.message : String(error) },
    });

    const consecutiveFailures = await countConsecutiveFailures(prisma, source.id);
    const sourceDisabled = consecutiveFailures >= CONSECUTIVE_FAILURES_BEFORE_DISABLE;

    if (sourceDisabled) {
      await prisma.source.update({ where: { id: source.id }, data: { active: false } });
      await writeAuditLog(prisma, {
        action: SCRAPE_SOURCE_DISABLED,
        entityType: SOURCE_ENTITY_TYPE,
        entityId: source.id,
        diff: { consecutiveFailures },
      });
    }

    throw new SourceRunFailedError(source.id, sourceDisabled, error);
  }
}
