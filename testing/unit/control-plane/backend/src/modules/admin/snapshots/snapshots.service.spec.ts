import { ConflictException, NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { SnapshotsService } from '../../../../../../../../control-plane/backend/src/modules/admin/snapshots/snapshots.service';

jest.mock(
  '@open-derja/core',
  () => ({
    writeAuditLog: jest.fn().mockResolvedValue(undefined),
    collectSnapshotJsonl: jest.fn(),
  }),
  { virtual: true },
);
const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    datasetSnapshot: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    corpusItem: { count: jest.fn().mockResolvedValue(0) },
    standardisationRule: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(overrides.tx ?? makeTx())),
    ...overrides,
  } as any;
}

function makeTx() {
  return { datasetSnapshot: { create: jest.fn().mockResolvedValue({ id: 'snap-1', version: 'v1' }) } };
}

function makeStorage(overrides: Record<string, unknown> = {}) {
  return {
    issueUpload: jest.fn().mockResolvedValue({ id: 'upload-1' }),
    putGenerated: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('SnapshotsService.create', () => {
  it('refuses to create a snapshot whose version already exists', async () => {
    const prisma = makePrisma({ datasetSnapshot: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }) } });
    const service = new SnapshotsService(prisma, makeStorage());

    await expect(service.create({ version: 'v1' } as any, 'actor-1')).rejects.toThrow(ConflictException);
  });

  it('builds and stores the JSONL export, returning a checksum and line count', async () => {
    const tx = makeTx();
    const prisma = makePrisma({ tx, corpusItem: { count: jest.fn().mockResolvedValue(42) } });
    const storage = makeStorage();
    mockedCore.collectSnapshotJsonl.mockResolvedValue({ body: 'line1\nline2\n', lines: 2 });
    const service = new SnapshotsService(prisma, storage);

    const result: any = await service.create({ version: 'v1', notes: 'first' } as any, 'actor-1');

    expect(storage.issueUpload).toHaveBeenCalledWith(expect.objectContaining({ kind: 'dataset_snapshot' }));
    expect(storage.putGenerated).toHaveBeenCalledWith('upload-1', 'line1\nline2\n', 'application/x-ndjson');
    expect(result.exportStatus).toBe('stored');
    expect(result.exportLines).toBe(2);
    expect(result.checksum).toHaveLength(64);
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });

  it('uses rule_version 0 when no standardisation rule has ever been created', async () => {
    const tx = makeTx();
    const prisma = makePrisma({ tx });
    mockedCore.collectSnapshotJsonl.mockResolvedValue({ body: '', lines: 0 });
    const service = new SnapshotsService(prisma, makeStorage());

    await service.create({ version: 'v1' } as any, 'actor-1');

    expect(tx.datasetSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ruleVersion: 0 }) }));
  });
});

describe('SnapshotsService.diff', () => {
  it('throws when either snapshot is missing', async () => {
    const prisma = makePrisma({
      datasetSnapshot: {
        findUnique: jest.fn().mockResolvedValueOnce({ id: 'a' }).mockResolvedValueOnce(null),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new SnapshotsService(prisma, makeStorage());

    await expect(service.diff('a', 'b')).rejects.toThrow(NotFoundException);
  });

  it('computes deltas between two snapshots', async () => {
    const prisma = makePrisma({
      datasetSnapshot: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'a', version: 'v1', corpusItemCount: 10, ruleVersion: 1 })
          .mockResolvedValueOnce({ id: 'b', version: 'v2', corpusItemCount: 25, ruleVersion: 2 }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    });
    const service = new SnapshotsService(prisma, makeStorage());

    const result = await service.diff('a', 'b');

    expect(result).toEqual({
      corpusItemCountDelta: 15,
      ruleVersionDelta: 1,
      from: { id: 'a', version: 'v1' },
      to: { id: 'b', version: 'v2' },
    });
  });
});

describe('SnapshotsService.deprecate', () => {
  it('throws when the snapshot does not exist', async () => {
    const prisma = makePrisma({
      datasetSnapshot: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    });
    const service = new SnapshotsService(prisma, makeStorage());

    await expect(service.deprecate('ghost', { reason: 'bad data' } as any, 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('appends a deprecation note without discarding existing notes', async () => {
    const update = jest.fn().mockResolvedValue({ id: 's1' });
    const prisma = makePrisma({
      datasetSnapshot: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', notes: 'original note' }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update,
      },
    });
    const service = new SnapshotsService(prisma, makeStorage());

    await service.deprecate('s1', { reason: 'superseded' } as any, 'actor-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { notes: 'original note\n[DEPRECATED] superseded' },
    });
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });
});
