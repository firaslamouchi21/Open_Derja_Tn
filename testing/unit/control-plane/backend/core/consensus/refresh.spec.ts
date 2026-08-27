import { refreshConsensus } from '../../../../../../control-plane/backend/core/src/consensus/refresh';

function makeClient() {
  return { tag: { findMany: jest.fn() }, tagConsensus: { upsert: jest.fn() } } as any;
}

const PARAMS = { corpusItemId: 'item-1', kind: 'region' as const, charStart: 0, charEnd: 10 };

describe('refreshConsensus', () => {
  it('groups tag values per annotator before computing agreement', async () => {
    const client = makeClient();
    client.tag.findMany.mockResolvedValue([
      { annotatorId: 'a1', value: 'sahel' },
      { annotatorId: 'a1', value: 'north' },
      { annotatorId: 'a2', value: 'sahel' },
    ]);
    client.tagConsensus.upsert.mockResolvedValue({});

    const result = await refreshConsensus(client, PARAMS);

    expect(result.agreedValues).toEqual(['sahel']);
    expect(result.annotatorN).toBe(2);
  });

  it('only reads human-authored tags, excluding machine suggestions from consensus', async () => {
    const client = makeClient();
    client.tag.findMany.mockResolvedValue([]);
    client.tagConsensus.upsert.mockResolvedValue({});

    await refreshConsensus(client, PARAMS);

    expect(client.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isMachine: false }) }),
    );
  });

  it('upserts the computed result keyed by the composite consensus key', async () => {
    const client = makeClient();
    client.tag.findMany.mockResolvedValue([
      { annotatorId: 'a1', value: 'sahel' },
      { annotatorId: 'a2', value: 'north' },
    ]);
    client.tagConsensus.upsert.mockResolvedValue({});

    await refreshConsensus(client, PARAMS);

    const upsertCall = client.tagConsensus.upsert.mock.calls[0][0];
    expect(upsertCall.where).toEqual({
      corpusItemId_kind_charStart_charEnd: { corpusItemId: 'item-1', kind: 'region', charStart: 0, charEnd: 10 },
    });
    expect(upsertCall.create).toMatchObject({ agreement: 0, needsAdjudication: true });
    expect(upsertCall.update).toMatchObject({ agreement: 0, needsAdjudication: true });
  });

  it('reports no adjudication needed and full agreement when there is no data at all', async () => {
    const client = makeClient();
    client.tag.findMany.mockResolvedValue([]);
    client.tagConsensus.upsert.mockResolvedValue({});

    const result = await refreshConsensus(client, PARAMS);

    expect(result).toEqual({ agreedValues: [], allValues: [], agreement: 1, annotatorN: 0, needsAdjudication: false });
  });
});
