import { getCoverage, getGaps, getLeaderboard } from '../../../../../../control-plane/backend/core/src/stats/public';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    contributorStats: { findMany: jest.fn().mockResolvedValue([]) },
    regionStats: { findMany: jest.fn().mockResolvedValue([]) },
    corpusItem: { groupBy: jest.fn().mockResolvedValue([]) },
    translatorStats: { findUnique: jest.fn().mockResolvedValue(null) },
    translatorRegionMiss: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe('getLeaderboard', () => {
  it('orders by approved count and caps the limit at 200', async () => {
    const prisma = makePrisma();

    await getLeaderboard(prisma, undefined, 999999);

    expect(prisma.contributorStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { approvedCount: 'desc' }, take: 200 }),
    );
  });

  it('filters by region when given', async () => {
    const prisma = makePrisma();

    await getLeaderboard(prisma, 'sahel');

    expect(prisma.contributorStats.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { region: 'sahel' } }));
  });

  it('never returns a session id or ip hash — only display-safe fields', async () => {
    const prisma = makePrisma();

    await getLeaderboard(prisma);

    const select = prisma.contributorStats.findMany.mock.calls[0][0].select;
    expect(select).toEqual({ contributorName: true, region: true, approvedCount: true, lastContributedAt: true });
  });
});

describe('getCoverage', () => {
  it('computes each region\'s share of the total', async () => {
    const prisma = makePrisma({
      regionStats: {
        findMany: jest.fn().mockResolvedValue([
          { region: 'north', corpusItemCount: 75, wordCount: 100, translationCount: 5 },
          { region: 'south', corpusItemCount: 25, wordCount: 30, translationCount: 1 },
        ]),
      },
    });

    const result = await getCoverage(prisma);

    expect(result.regions).toEqual([
      { region: 'north', corpusItemCount: 75, wordCount: 100, translationCount: 5, share: 0.75 },
      { region: 'south', corpusItemCount: 25, wordCount: 30, translationCount: 1, share: 0.25 },
    ]);
  });

  it('reports a null share for every region when the corpus is empty', async () => {
    const prisma = makePrisma({ regionStats: { findMany: jest.fn().mockResolvedValue([{ region: 'north', corpusItemCount: 0, wordCount: 0, translationCount: 0 }]) } });

    const result = await getCoverage(prisma);

    expect(result.regions[0].share).toBeNull();
  });

  it('reports level distribution from corpus item unit counts', async () => {
    const prisma = makePrisma({
      corpusItem: { groupBy: jest.fn().mockResolvedValue([{ unit: 'sentence', _count: { _all: 40 } }]) },
    });

    const result = await getCoverage(prisma);

    expect(result.levelDistribution).toEqual([{ unit: 'sentence', count: 40 }]);
  });

  it('reports translator stats as null rather than throwing when none exist yet', async () => {
    const prisma = makePrisma();

    const result = await getCoverage(prisma);

    expect(result.translator).toBeNull();
  });
});

describe('getGaps', () => {
  it('ranks translator misses by miss rate descending', async () => {
    const prisma = makePrisma({
      translatorRegionMiss: {
        findMany: jest.fn().mockResolvedValue([{ region: 'south', missRate: 0.8 }]),
      },
    });

    const result = await getGaps(prisma);

    expect(result.translatorMisses).toEqual([{ region: 'south', missRate: 0.8 }]);
    expect(prisma.translatorRegionMiss.findMany).toHaveBeenCalledWith({ orderBy: { missRate: 'desc' } });
  });

  it('flags regions below the 15% balance threshold, weakest first', async () => {
    const prisma = makePrisma({
      regionStats: {
        findMany: jest.fn().mockResolvedValue([
          { region: 'north', corpusItemCount: 90 },
          { region: 'south', corpusItemCount: 5 },
          { region: 'sahel', corpusItemCount: 5 },
        ]),
      },
    });

    const result = await getGaps(prisma);

    expect(result.weakRegions.map((r) => r.region)).toEqual(['south', 'sahel']);
  });

  it('flags no regions as weak when the corpus is empty (nothing to compare)', async () => {
    const prisma = makePrisma();

    const result = await getGaps(prisma);

    expect(result.weakRegions).toEqual([]);
  });
});
