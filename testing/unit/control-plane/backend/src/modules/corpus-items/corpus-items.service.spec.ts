import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { CorpusItemsService } from '../../../../../../../control-plane/backend/src/modules/corpus-items/corpus-items.service';

jest.mock(
  '@open-derja/core',
  () => ({
    assignDatasetSplit: jest.fn(),
    checkNearDuplicates: jest.fn(),
    cleanText: jest.fn((text: string) => text),
    computeMatchKey: jest.fn(),
    detectScript: jest.fn(),
    detectUnit: jest.fn(),
    isWithinLengthBounds: jest.fn(() => true),
    onCorpusItemIngested: jest.fn(),
    searchCorpusItems: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
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
    tag: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  };
  return prisma;
}

const CTX = { sessionId: 'session-1', ipHash: 'hash-1' };

beforeEach(() => {
  jest.clearAllMocks();
  mockedCore.cleanText.mockImplementation((text: string) => text);
  mockedCore.isWithinLengthBounds.mockReturnValue(true);
});

describe('CorpusItemsService.contribute', () => {
  it('reuses an existing contribution source instead of creating a new one', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'cc_by_sa' });
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

  it('creates a contribution source with a commercially-clean license default on first use', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue(null);
    prisma.source.create.mockResolvedValue({ id: 'new-source', licenseDefault: 'cc_by_sa' });
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
      expect.objectContaining({ data: expect.objectContaining({ kind: 'contribution', active: true, licenseDefault: 'cc_by_sa' }) }),
    );
  });

  it('reclassifies a latin-script contribution as arabizi rather than leaving it "latin"', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'cc_by_sa' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
    prisma.corpusItem.create.mockResolvedValue({ id: 'item-1', unit: 'phrase', script: 'arabizi', datasetSplit: 'train', version: 1 });
    prisma.submissionMeta.create.mockResolvedValue({});
    mockedCore.detectScript.mockReturnValue('latin' as any);
    mockedCore.detectUnit.mockReturnValue('phrase' as any);
    mockedCore.computeMatchKey.mockReturnValue('key');
    mockedCore.assignDatasetSplit.mockReturnValue('train' as any);
    mockedCore.onCorpusItemIngested.mockReturnValue([] as any);

    const service = new CorpusItemsService(prisma);
    const result: any = await service.contribute({ text: 'chnowa', consentGiven: true } as any, CTX);

    expect(prisma.corpusItem.create.mock.calls[0][0].data.script).toBe('arabizi');
    expect(result.script).toBe('arabizi');
  });

  it('leaves a genuinely arabic-script contribution untouched', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'cc_by_sa' });
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
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'cc_by_sa' });
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
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'cc_by_sa' });
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

  it('rejects a contribution outside the domain length bounds without creating anything', async () => {
    const prisma = makePrisma();
    mockedCore.isWithinLengthBounds.mockReturnValue(false);

    const service = new CorpusItemsService(prisma);

    await expect(service.contribute({ text: 'hi', consentGiven: true } as any, CTX)).rejects.toThrow(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('returns a duplicate result with known regions instead of creating a new corpus item', async () => {
    const prisma = makePrisma();
    mockedCore.computeMatchKey.mockReturnValue('key');
    prisma.$queryRaw.mockResolvedValue([{ id: 'existing-item', text: 'chnowa hwelek' }]);
    mockedCore.checkNearDuplicates.mockResolvedValue({
      isNearDuplicate: true,
      matches: [{ id: 'existing-item', similarity: 0.97 }],
    } as any);
    prisma.tag.findMany.mockResolvedValue([{ value: 'north' }, { value: 'sahel' }]);

    const service = new CorpusItemsService(prisma);
    const result = await service.contribute({ text: 'chnowa hwelek', consentGiven: true } as any, CTX);

    expect(result).toEqual({ duplicate: true, existingCorpusItemId: 'existing-item', knownRegions: ['north', 'sahel'] });
    expect(prisma.document.create).not.toHaveBeenCalled();
    expect(prisma.corpusItem.create).not.toHaveBeenCalled();
    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { corpusItemId: 'existing-item', kind: 'region' } }),
    );
  });

  it('proceeds to create a new corpus item when candidates exist but none are near-duplicates', async () => {
    const prisma = makePrisma();
    prisma.$queryRaw.mockResolvedValue([{ id: 'unrelated-item', text: 'something else entirely' }]);
    mockedCore.checkNearDuplicates.mockResolvedValue({ isNearDuplicate: false, matches: [] } as any);
    prisma.source.findFirst.mockResolvedValue({ id: 'source-1', licenseDefault: 'cc_by_sa' });
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

    expect(result).toMatchObject({ duplicate: false, id: 'item-1' });
    expect(prisma.corpusItem.create).toHaveBeenCalled();
  });
});

describe('CorpusItemsService.explore', () => {
  it('delegates straight to searchCorpusItems with the given query', async () => {
    const prisma = makePrisma();
    prisma.source.findFirst.mockResolvedValue(null);
    const service = new CorpusItemsService(prisma);

    const query = { regions: ['north'], page: 2 } as any;
    const result = await service.explore(query);

    expect(mockedCore.searchCorpusItems).toHaveBeenCalledWith(prisma, query);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
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
