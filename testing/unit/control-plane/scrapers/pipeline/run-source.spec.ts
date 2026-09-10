import { runSource } from '../../../../../control-plane/scrapers/src/pipeline/run-source';
import { SourceRunFailedError } from '../../../../../control-plane/scrapers/src/pipeline/source-run-failed-error';

jest.mock('@open-derja/core', () => ({
  ingestDocument: jest.fn(),
  loadActiveMarkerTerms: jest.fn().mockResolvedValue([]),
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { ingestDocument, loadActiveMarkerTerms, writeAuditLog } from '@open-derja/core';

const mockIngestDocument = ingestDocument as jest.Mock;
const mockLoadActiveMarkerTerms = loadActiveMarkerTerms as jest.Mock;
const mockWriteAuditLog = writeAuditLog as jest.Mock;

const SOURCE = { id: 'source-1', name: 'Test Source', lastRunAt: null } as any;

function fakeRunner(items: Array<{ externalRef: string; rawBody: string }>) {
  return {
    async *fetch() {
      for (const item of items) {
        yield { ...item, fetchedAt: new Date('2026-01-01') };
      }
    },
  };
}

function makePrisma(auditLogRows: Array<{ action: string }> = []) {
  return {
    source: { update: jest.fn().mockResolvedValue(SOURCE) },
    auditLog: { findMany: jest.fn().mockResolvedValue(auditLogRows) },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadActiveMarkerTerms.mockResolvedValue([]);
});

describe('runSource', () => {
  it('ingests every fetched item, updates lastRunAt, and logs a success audit row', async () => {
    const prisma = makePrisma();
    mockIngestDocument.mockResolvedValue({ documentId: 'doc-1', corpusItemIds: ['item-1', 'item-2'], nearDuplicatesSkipped: 1 });
    const runner = fakeRunner([{ externalRef: 'a', rawBody: 'text a' }]);

    const result = await runSource(prisma, SOURCE, runner);

    expect(result).toEqual({ documentsIngested: 1, corpusItemsInserted: 2, nearDuplicatesSkipped: 1 });
    expect(prisma.source.update).toHaveBeenCalledWith({ where: { id: 'source-1' }, data: { lastRunAt: expect.any(Date) } });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'scrape_run_succeeded', entityType: 'source', entityId: 'source-1' }),
    );
  });

  it('stops after the per-run item cap even if the runner has more to give', async () => {
    const prisma = makePrisma();
    mockIngestDocument.mockResolvedValue({ documentId: 'doc-1', corpusItemIds: ['item-1'], nearDuplicatesSkipped: 0 });
    const items = Array.from({ length: 5 }, (_, i) => ({ externalRef: `${i}`, rawBody: `text ${i}` }));
    const runner = fakeRunner(items);

    const result = await runSource(prisma, SOURCE, runner);

    expect(result.documentsIngested).toBe(5);
  });

  it('logs a failure and rethrows without disabling the source on the first failure', async () => {
    const prisma = makePrisma([]);
    mockIngestDocument.mockRejectedValue(new Error('boom'));
    const runner = fakeRunner([{ externalRef: 'a', rawBody: 'text a' }]);

    await expect(runSource(prisma, SOURCE, runner)).rejects.toThrow(SourceRunFailedError);

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'scrape_run_failed', entityType: 'source', entityId: 'source-1' }),
    );
    expect(prisma.source.update).not.toHaveBeenCalled();
  });

  it('disables the source after two consecutive failed runs', async () => {
    const prisma = makePrisma([{ action: 'scrape_run_failed' }, { action: 'scrape_run_failed' }]);
    mockIngestDocument.mockRejectedValue(new Error('boom again'));
    const runner = fakeRunner([{ externalRef: 'a', rawBody: 'text a' }]);

    let caught: unknown;
    try {
      await runSource(prisma, SOURCE, runner);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SourceRunFailedError);
    expect((caught as InstanceType<typeof SourceRunFailedError>).sourceDisabled).toBe(true);
    expect(prisma.source.update).toHaveBeenCalledWith({ where: { id: 'source-1' }, data: { active: false } });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'scrape_source_disabled', entityType: 'source', entityId: 'source-1' }),
    );
  });

  it('does not disable the source when a prior failure is separated by a success', async () => {
    const prisma = makePrisma([{ action: 'scrape_run_succeeded' }]);
    mockIngestDocument.mockRejectedValue(new Error('boom'));
    const runner = fakeRunner([{ externalRef: 'a', rawBody: 'text a' }]);

    let caught: unknown;
    try {
      await runSource(prisma, SOURCE, runner);
    } catch (error) {
      caught = error;
    }

    expect((caught as InstanceType<typeof SourceRunFailedError>).sourceDisabled).toBe(false);
    expect(prisma.source.update).not.toHaveBeenCalledWith({ where: { id: 'source-1' }, data: { active: false } });
  });

  it('passes the loaded marker list through to ingestDocument', async () => {
    const prisma = makePrisma();
    mockLoadActiveMarkerTerms.mockResolvedValue(['barsha', 'towa']);
    mockIngestDocument.mockResolvedValue({ documentId: 'doc-1', corpusItemIds: [], nearDuplicatesSkipped: 0 });
    const runner = fakeRunner([{ externalRef: 'a', rawBody: 'text a' }]);

    await runSource(prisma, SOURCE, runner);

    expect(mockIngestDocument).toHaveBeenCalledWith(
      prisma,
      SOURCE,
      expect.objectContaining({ externalRef: 'a' }),
      ['barsha', 'towa'],
      process.env.DATA_PLANE_URL,
    );
  });
});
