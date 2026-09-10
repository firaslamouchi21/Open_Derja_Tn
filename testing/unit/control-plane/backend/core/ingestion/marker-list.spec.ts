import { loadActiveMarkerTerms } from '../../../../../../control-plane/backend/core/src/ingestion/marker-list';

function makePrisma(maxVersion: number | null, rows: Array<{ term: string }>) {
  return {
    markerTerm: {
      aggregate: jest.fn().mockResolvedValue({ _max: { listVersion: maxVersion } }),
      findMany: jest.fn().mockResolvedValue(rows),
    },
  } as any;
}

describe('loadActiveMarkerTerms', () => {
  it('returns an empty list when no marker list version has ever been seeded', async () => {
    const prisma = makePrisma(null, []);

    const result = await loadActiveMarkerTerms(prisma);

    expect(result).toEqual([]);
    expect(prisma.markerTerm.findMany).not.toHaveBeenCalled();
  });

  it('loads active terms at the highest list version when none is given', async () => {
    const prisma = makePrisma(3, [{ term: 'barsha' }, { term: 'chnowa' }]);

    const result = await loadActiveMarkerTerms(prisma);

    expect(prisma.markerTerm.findMany).toHaveBeenCalledWith({
      where: { listVersion: 3, active: true },
      select: { term: true },
    });
    expect(result).toEqual(['barsha', 'chnowa']);
  });

  it('loads active terms at a pinned list version, skipping the max lookup', async () => {
    const prisma = makePrisma(3, [{ term: 'towa' }]);

    const result = await loadActiveMarkerTerms(prisma, 1);

    expect(prisma.markerTerm.aggregate).not.toHaveBeenCalled();
    expect(prisma.markerTerm.findMany).toHaveBeenCalledWith({
      where: { listVersion: 1, active: true },
      select: { term: true },
    });
    expect(result).toEqual(['towa']);
  });
});
