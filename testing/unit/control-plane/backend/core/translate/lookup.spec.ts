import { lookupTranslation } from '../../../../../../control-plane/backend/core/src/translate/lookup';

function makeClient() {
  return {
    lexiconVariant: { findMany: jest.fn() },
    corpusItem: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  } as any;
}

describe('lookupTranslation', () => {
  it('returns exact matches, no fuzzy noise, and every region missing when nothing is attested', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([{ id: 'v1', regions: [] }]);
    client.$queryRaw.mockResolvedValueOnce([]); // fuzzy variant candidates
    client.$queryRaw.mockResolvedValueOnce([]); // sentence candidates
    client.corpusItem.findMany.mockResolvedValueOnce([]);

    const result = await lookupTranslation(client, 'chnowa');

    expect(result.exact).toEqual([{ id: 'v1', regions: [] }]);
    expect(result.fuzzy).toEqual([]);
    expect(result.sentences).toEqual([]);
    expect(result.missingRegions.sort()).toEqual(['north', 'northwest', 'sahel', 'south']);
  });

  it('excludes exact-match ids from the fuzzy result set and sorts fuzzy by similarity descending', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([{ id: 'v1', regions: [] }]);
    client.$queryRaw.mockResolvedValueOnce([
      { id: 'v1', similarity: 0.99 },
      { id: 'v2', similarity: 0.5 },
      { id: 'v3', similarity: 0.4 },
    ]);
    client.lexiconVariant.findMany.mockResolvedValueOnce([
      { id: 'v2', regions: [] },
      { id: 'v3', regions: [] },
    ]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.corpusItem.findMany.mockResolvedValueOnce([]);

    const result = await lookupTranslation(client, 'chnowa');

    expect(result.fuzzy.map((f) => f.variant.id)).toEqual(['v2', 'v3']);
    expect(result.fuzzy[0].similarity).toBeGreaterThanOrEqual(result.fuzzy[1].similarity);
    const fuzzyWhereCall = client.lexiconVariant.findMany.mock.calls[1][0];
    expect(fuzzyWhereCall.where.id.in.sort()).toEqual(['v2', 'v3']);
  });

  it('drops fuzzy candidates below the similarity threshold', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([
      { id: 'v-low', similarity: 0.1 },
      { id: 'v-high', similarity: 0.35 },
    ]);
    client.lexiconVariant.findMany.mockResolvedValueOnce([
      { id: 'v-low', regions: [] },
      { id: 'v-high', regions: [] },
    ]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.corpusItem.findMany.mockResolvedValueOnce([]);

    const result = await lookupTranslation(client, 'chnowa');

    expect(result.fuzzy.map((f) => f.variant.id)).toEqual(['v-high']);
  });

  it('skips the fuzzy lookup query entirely when no exact match exists and no fuzzy ids are returned', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.corpusItem.findMany.mockResolvedValueOnce([]);

    await lookupTranslation(client, 'chnowa');

    expect(client.lexiconVariant.findMany).toHaveBeenCalledTimes(1);
  });

  it('attaches sentence similarity and sorts sentences by similarity descending', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([
      { id: 's1', similarity: 0.4 },
      { id: 's2', similarity: 0.8 },
    ]);
    client.corpusItem.findMany.mockResolvedValueOnce([
      { id: 's1', text: 'a' },
      { id: 's2', text: 'b' },
    ]);

    const result = await lookupTranslation(client, 'chnowa');

    expect(result.sentences.map((s) => s.item.id)).toEqual(['s2', 's1']);
  });

  it('computes missingRegions as every region not attested by an exact or fuzzy variant', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([{ id: 'v1', regions: [{ region: 'sahel' }] }]);
    client.$queryRaw.mockResolvedValueOnce([{ id: 'v2', similarity: 0.9 }]);
    client.lexiconVariant.findMany.mockResolvedValueOnce([{ id: 'v2', regions: [{ region: 'north' }] }]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.corpusItem.findMany.mockResolvedValueOnce([]);

    const result = await lookupTranslation(client, 'chnowa');

    expect(result.missingRegions.sort()).toEqual(['northwest', 'south']);
  });

  it('scopes the exact-match query to the requested region', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.$queryRaw.mockResolvedValueOnce([]);
    client.corpusItem.findMany.mockResolvedValueOnce([]);

    await lookupTranslation(client, 'chnowa', 'sahel');

    const exactWhere = client.lexiconVariant.findMany.mock.calls[0][0].where;
    expect(exactWhere.regions).toEqual({ some: { region: 'sahel' } });
  });

  it('excludes the vulgar register by default and includes it when includeVulgar is true', async () => {
    const client = makeClient();
    client.lexiconVariant.findMany.mockResolvedValue([]);
    client.$queryRaw.mockResolvedValue([]);
    client.corpusItem.findMany.mockResolvedValue([]);

    await lookupTranslation(client, 'chnowa', undefined, false);
    expect(client.lexiconVariant.findMany.mock.calls[0][0].where.register).toEqual({ not: 'vulgar' });

    client.lexiconVariant.findMany.mockClear();
    await lookupTranslation(client, 'chnowa', undefined, true);
    expect(client.lexiconVariant.findMany.mock.calls[0][0].where.register).toBeUndefined();
  });
});
