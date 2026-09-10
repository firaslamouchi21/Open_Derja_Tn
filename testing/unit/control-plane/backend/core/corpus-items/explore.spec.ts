import { searchCorpusItems } from '../../../../../../control-plane/backend/core/src/corpus-items/explore';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    corpusItem: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  } as any;
}

describe('searchCorpusItems', () => {
  it('applies no filters when none are given', async () => {
    const prisma = makePrisma();

    await searchCorpusItems(prisma, {});

    expect(prisma.corpusItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('filters by region via an EXISTS check against tag_consensus, not the whole item', async () => {
    const prisma = makePrisma();

    await searchCorpusItems(prisma, { regions: ['north', 'sahel'] });

    const where = prisma.corpusItem.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({
      tagConsensus: { some: { kind: 'region', agreedValues: { hasSome: ['north', 'sahel'] } } },
    });
  });

  it('combines multiple axis filters with AND', async () => {
    const prisma = makePrisma();

    await searchCorpusItems(prisma, { scope: 'regional', era: 'historical', script: 'arabic' });

    const where = prisma.corpusItem.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ tagConsensus: { some: { kind: 'scope', agreedValues: { has: 'regional' } } } });
    expect(where.AND).toContainEqual({ tagConsensus: { some: { kind: 'era', agreedValues: { has: 'historical' } } } });
    expect(where.AND).toContainEqual({ script: 'arabic' });
  });

  it('filters on translation presence in either direction', async () => {
    const prisma = makePrisma();

    await searchCorpusItems(prisma, { hasTranslation: true });
    expect(prisma.corpusItem.findMany.mock.calls[0][0].where.AND).toContainEqual({ translations: { some: {} } });

    await searchCorpusItems(prisma, { hasTranslation: false });
    expect(prisma.corpusItem.findMany.mock.calls[1][0].where.AND).toContainEqual({ translations: { none: {} } });
  });

  it('paginates with sane defaults and caps page size', async () => {
    const prisma = makePrisma();

    const result = await searchCorpusItems(prisma, { pageSize: 99999 });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(100);
    expect(prisma.corpusItem.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('computes skip from page and pageSize', async () => {
    const prisma = makePrisma();

    await searchCorpusItems(prisma, { page: 3, pageSize: 10 });

    expect(prisma.corpusItem.findMany.mock.calls[0][0].skip).toBe(20);
  });

  it('returns the total count alongside the page of items', async () => {
    const prisma = makePrisma({
      corpusItem: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }]), count: jest.fn().mockResolvedValue(42) },
    });

    const result = await searchCorpusItems(prisma, {});

    expect(result).toEqual({ items: [{ id: 'a' }], total: 42, page: 1, pageSize: 20 });
  });
});
