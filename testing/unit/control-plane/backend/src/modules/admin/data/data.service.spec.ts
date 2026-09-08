import { BadRequestException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { DataService } from '../../../../../../../../control-plane/backend/src/modules/admin/data/data.service';

jest.mock('@open-derja/core', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }), { virtual: true });
const mockedCore = core as jest.Mocked<typeof core>;

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    task: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    document: { update: jest.fn().mockResolvedValue({}) },
    corpusItem: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ text: 'hello world', version: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    tag: { deleteMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
    lexiconVariant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    lexiconOrigin: { updateMany: jest.fn().mockResolvedValue({}) },
    translation: { updateMany: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  const tx = overrides.tx ?? makeTx();
  return {
    source: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    document: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    corpusItem: {
      findMany: jest.fn().mockResolvedValue([{ id: 'ci-1' }]),
      count: jest.fn().mockResolvedValue(0),
    },
    translatorRegionMiss: { findMany: jest.fn().mockResolvedValue([]) },
    translatorLookup: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('DataService.browse', () => {
  it('rejects a table that is not on the browsable allowlist', async () => {
    const service = new DataService(makePrisma());

    await expect(service.browse('users_secrets', 0, 20)).rejects.toThrow(BadRequestException);
  });

  it('caps take at 200 regardless of what is requested', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = makePrisma({ source: { findMany, count } });
    const service = new DataService(prisma);

    await service.browse('sources', 0, 10000);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });

  it('returns rows and total for a valid table', async () => {
    const prisma = makePrisma({
      corpusItem: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }]), count: jest.fn().mockResolvedValue(1) },
    });
    const service = new DataService(prisma);

    await expect(service.browse('corpus_items', 0, 20)).resolves.toEqual({ rows: [{ id: 'a' }], total: 1 });
  });
});

describe('DataService.rejectScrapeBatch', () => {
  it('rejects open tasks for the document and revokes its rights', async () => {
    const tx = makeTx();
    const prisma = makePrisma({
      tx,
      corpusItem: { findMany: jest.fn().mockResolvedValue([{ id: 'ci-1' }, { id: 'ci-2' }]), count: jest.fn() },
    });
    const service = new DataService(prisma);

    const result = await service.rejectScrapeBatch({ documentId: 'doc-1', confirmCount: 2 } as any, 'actor-1');

    expect(result).toEqual({ rejected: 2 });
    expect(tx.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ corpusItemId: { in: ['ci-1', 'ci-2'] } }) }),
    );
    expect(tx.document.update).toHaveBeenCalledWith({ where: { id: 'doc-1' }, data: { rightsStatus: 'revoked' } });
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });

  it('refuses when the confirm count does not match the real item count', async () => {
    const prisma = makePrisma({ corpusItem: { findMany: jest.fn().mockResolvedValue([{ id: 'ci-1' }]), count: jest.fn() } });
    const service = new DataService(prisma);

    await expect(service.rejectScrapeBatch({ documentId: 'doc-1', confirmCount: 99 } as any, 'actor-1')).rejects.toThrow();
  });
});

describe('DataService.reassignRegion', () => {
  it('replaces region tags on every listed item and bumps its version', async () => {
    const tx = makeTx();
    const prisma = makePrisma({ tx });
    const service = new DataService(prisma);

    const result = await service.reassignRegion(
      { corpusItemIds: ['ci-1'], regions: ['north', 'sahel'], confirmCount: 1 } as any,
      'actor-1',
    );

    expect(result).toEqual({ updated: 1 });
    expect(tx.tag.deleteMany).toHaveBeenCalledWith({ where: { corpusItemId: 'ci-1', kind: 'region' } });
    expect(tx.tag.create).toHaveBeenCalledTimes(2);
    expect(tx.corpusItem.update).toHaveBeenCalledWith({ where: { id: 'ci-1' }, data: { version: { increment: 1 } } });
  });

  it('spans the full text width for the new region tag, never a null span', async () => {
    const tx = makeTx({ corpusItem: { findUniqueOrThrow: jest.fn().mockResolvedValue({ text: 'abcdefghij', version: 1 }), update: jest.fn() } });
    const prisma = makePrisma({ tx });
    const service = new DataService(prisma);

    await service.reassignRegion({ corpusItemIds: ['ci-1'], regions: ['north'], confirmCount: 1 } as any, 'actor-1');

    expect(tx.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ charStart: 0, charEnd: 10 }) }),
    );
  });
});

describe('DataService.mergeLexiconEntries', () => {
  it('refuses to merge an entry into itself', async () => {
    const service = new DataService(makePrisma());

    await expect(service.mergeLexiconEntries({ sourceEntryId: 'e1', targetEntryId: 'e1' } as any, 'actor-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('moves variants, origins, and translations to the target entry', async () => {
    const tx = makeTx({ lexiconVariant: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) } });
    const prisma = makePrisma({ tx });
    const service = new DataService(prisma);

    const result = await service.mergeLexiconEntries({ sourceEntryId: 'e1', targetEntryId: 'e2' } as any, 'actor-1');

    expect(result).toEqual({ movedVariants: 3 });
    expect(tx.lexiconOrigin.updateMany).toHaveBeenCalledWith({ where: { lexiconEntryId: 'e1' }, data: { lexiconEntryId: 'e2' } });
    expect(tx.translation.updateMany).toHaveBeenCalledWith({ where: { lexiconEntryId: 'e1' }, data: { lexiconEntryId: 'e2' } });
  });
});

describe('DataService.translatorMissLog', () => {
  it('ranks unattested search terms by search count, capped at the given limit', async () => {
    const prisma = makePrisma({
      translatorLookup: {
        groupBy: jest.fn().mockResolvedValue([{ matchKey: 'mk1', _count: { _all: 5 }, _max: { queryText: 'chnowa' } }]),
      },
    });
    const service = new DataService(prisma);

    const result = await service.translatorMissLog(10);

    expect(result).toEqual([{ matchKey: 'mk1', queryText: 'chnowa', searches: 5 }]);
    expect(prisma.translatorLookup.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { hit: false }, take: 10 }));
  });

  it('caps the limit at 500', async () => {
    const prisma = makePrisma();
    const service = new DataService(prisma);

    await service.translatorMissLog(999999);

    expect(prisma.translatorLookup.groupBy).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
  });

  it('falls back to the match key when no query text was ever recorded', async () => {
    const prisma = makePrisma({
      translatorLookup: {
        groupBy: jest.fn().mockResolvedValue([{ matchKey: 'mk1', _count: { _all: 2 }, _max: { queryText: null } }]),
      },
    });
    const service = new DataService(prisma);

    const result = await service.translatorMissLog();

    expect(result[0].queryText).toBe('mk1');
  });
});
