import type { PrismaClient, SourceKind } from '@open-derja/db';
import { createSourceRunner } from '../sources/registry';
import { runSource, type RunSourceResult } from './run-source';

export interface RunActiveSourcesResult {
  sourceId: string;
  sourceName: string;
  outcome: 'ran' | 'skipped' | 'failed';
  result?: RunSourceResult;
  error?: string;
}

const IMPLEMENTED_SOURCE_KINDS: SourceKind[] = ['wikipedia'];

export async function runActiveSources(prisma: PrismaClient): Promise<RunActiveSourcesResult[]> {
  const sources = await prisma.source.findMany({ where: { active: true, kind: { in: IMPLEMENTED_SOURCE_KINDS } } });

  const results: RunActiveSourcesResult[] = [];
  for (const source of sources) {
    try {
      const runner = createSourceRunner(source);
      const result = await runSource(prisma, source, runner);
      results.push({ sourceId: source.id, sourceName: source.name, outcome: 'ran', result });
    } catch (error) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        outcome: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
