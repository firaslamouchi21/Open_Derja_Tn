import { NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { CorpusItemsService } from '../../../../../../../control-plane/backend/src/modules/corpus-items/corpus-items.service';

jest.mock(
  '@open-derja/core',
  () => ({
    assignDatasetSplit: jest.fn(),
    computeMatchKey: jest.fn(),
    detectScript: jest.fn(),
    detectUnit: jest.fn(),
    onCorpusItemIngested: jest.fn(),
    spawnTasks: jest.fn(),
  }),
  { virtual: true },
);

const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma() {
  const prisma: any = {
    source: { findFirst: jest.fn(), create: jest.fn() },
    document: { create: jest.fn() },
    corpusItem: { create: jest.fn(), findUnique: jest.fn() },
    submissionMeta: { create: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  };
  return prisma;
}

const CTX = { sessionId: 'session-1', ipHash: 'hash-1' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CorpusItemsService.contribute', () => {
  it('reuses an existing contribution source instead of creating a new one', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'unknown' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'latin', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('arabic' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue([] as any);

    const service = new CorpusItemsService(prisma);
    await service.contribute({ text: 'شنوة', consentGiven: true } as any, CTX);

    expect(prisma.source.create).not.toHaveBeenCalled();
    expect(prisma.document.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sourceId: 'source-1' }) }));
  });

  it('creates a contribution source on first use when none exists yet', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue(null);
    prisma.source.create.mockResolvedValue({ id: 'new-source', licenseDefault: 'unknown' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'latin', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('latin' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue([] as any);

    const service = new CorpusItemsService(prisma);
    await service.contribute({ text: 'chnowa', consentGiven: true } as any, CTX);

    expect(prisma.source.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: 'contribution', active: true }) }),
    );
  });

  it('reclassifies a latin-script contribution as arabizi rather than leaving it "latin"', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'unknown' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'arabizi', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('latin' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue([] as any);

    const service = new CorpusItemsService(prisma);
    const result = await service.contribute({ text: 'chnowa', consentGiven: true } as any, CTX);

    expect(prisma.corpusItem.create.mock.calls[0][0].data.script).toBe('arabizi');
    expect(result.script).toBe('arabizi');
  });

  it('leaves a genuinely arabic-script contribution untouched', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'unknown' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'arabic', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('arabic' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue([] as any);

    const service = new CorpusItemsService(prisma);
    await service.contribute({ text: 'شنوة', consentGiven: true } as any, CTX);

    expect(prisma.corpusItem.create.mock.calls[0][0].data.script).toBe('arabic');
  });

  it('records the contributor consent and self-reported fields on the submission meta row', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'unknown' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'arabizi', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('latin' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue([] as any);

    const service = new CorpusItemsService(prisma);
    await service.contribute(
      {
        text: 'chnowa',
        consentGiven: true,
        consentVoice: true,
        selfReportedRegion: 'sahel',
        selfReportedOrigin: 'sfax',
        contributorName: 'Firas',
        contributorEmail: 'a@b.com',
      } as any,
      CTX,
    );

    expect(prisma.submissionMeta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contributorName: 'Firas',
        contributorEmail: 'a@b.com',
        selfReportedRegion: 'sahel',
        selfReportedOrigin: 'sfax',
        sessionId: 'session-1',
        ipHash: 'hash-1',
        consentGiven: true,
        consentVoice: true,
      }),
    });
  });

  it('spawns the ingestion follow-up tasks after the transaction commits', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'unknown' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'arabizi', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('latin' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue(['spec-1'] as any);

    const service = new CorpusItemsService(prisma);
    await service.contribute({ text: 'chnowa', consentGiven: true } as any, CTX);

    expect(mockedCore.onCorpusItemIngested).toHaveBeenCalledWith('item-1', 1);
    expect(mockedCore.spawnTasks).toHaveBeenCalledWith(prisma, ['spec-1']);
  });
});

describe('CorpusItemsService.findOne', () => {
  it('throws NotFoundException when the item does not exist', async () => {
    const prisma = makePrisma();
    prisma.corpusItem.findUnique.mockResolvedValue(null);
    const service = new CorpusItemsService(prisma);

    await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
  });

  it('returns the item when found', async () => {
    const prisma = makePrisma();
    prisma.corpusItem.findUnique.mockResolvedValue({ id: 'item-1', text: 'chnowa' });
    const service = new CorpusItemsService(prisma);

    await expect(service.findOne('item-1')).resolves.toEqual({ id: 'item-1', text: 'chnowa' });
  });
});
