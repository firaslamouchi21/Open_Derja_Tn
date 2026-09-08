import { listPublicSnapshots } from '../../../../../../control-plane/backend/core/src/export/public-snapshots';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    datasetSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe('listPublicSnapshots', () => {
  it('only lists snapshots whose stored object actually finished uploading', async () => {
    const prisma = makePrisma();

    await listPublicSnapshots(prisma);

    expect(prisma.datasetSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storedObject: { status: 'stored' } } }),
    );
  });

  it('flattens the stored object into checksum and size fields', async () => {
    const prisma = makePrisma({
      datasetSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'snap-1',
            version: '2026.09.0',
            corpusItemCount: 100,
            ruleVersion: 1,
            notes: 'first release',
            createdAt: new Date('2026-09-01T00:00:00Z'),
            storedObject: { checksum: 'abc123', sizeBytes: BigInt(4096) },
          },
        ]),
      },
    });

    const result = await listPublicSnapshots(prisma);

    expect(result).toEqual([
      {
        id: 'snap-1',
        version: '2026.09.0',
        corpusItemCount: 100,
        ruleVersion: 1,
        notes: 'first release',
        createdAt: new Date('2026-09-01T00:00:00Z'),
        format: 'jsonl',
        checksum: 'abc123',
        sizeBytes: '4096',
      },
    ]);
  });

  it('reports a null size rather than throwing when the stored object has none yet', async () => {
    const prisma = makePrisma({
      datasetSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'snap-2',
            version: '2026.09.1',
            corpusItemCount: 0,
            ruleVersion: 1,
            notes: null,
            createdAt: new Date('2026-09-02T00:00:00Z'),
            storedObject: { checksum: null, sizeBytes: null },
          },
        ]),
      },
    });

    const result = await listPublicSnapshots(prisma);

    expect(result[0].sizeBytes).toBeNull();
    expect(result[0].checksum).toBeNull();
  });
});
