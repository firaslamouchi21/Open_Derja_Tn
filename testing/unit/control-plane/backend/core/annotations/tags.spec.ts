import { addFullSpanTag, addRegionTags } from '../../../../../../control-plane/backend/core/src/annotations/tags';

function makeClient() {
  return { tag: { create: jest.fn() } } as any;
}

describe('addFullSpanTag', () => {
  it('spans the entire text, from 0 to the given text length', async () => {
    const client = makeClient();
    client.tag.create.mockResolvedValue({ id: 'tag-1' });

    await addFullSpanTag(client, {
      corpusItemId: 'item-1',
      kind: 'quality',
      value: 'high',
      textLength: 42,
      annotatorId: 'user-1',
      isMachine: false,
    });

    expect(client.tag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ charStart: 0, charEnd: 42 }),
    });
  });
});

describe('addRegionTags', () => {
  it('writes one full-span tag per region, preserving order', async () => {
    const client = makeClient();
    client.tag.create
      .mockResolvedValueOnce({ id: 'tag-1', value: 'sahel' })
      .mockResolvedValueOnce({ id: 'tag-2', value: 'north' });

    const result = await addRegionTags(client, {
      corpusItemId: 'item-1',
      regions: ['sahel', 'north'],
      textLength: 10,
      annotatorId: 'user-1',
      isMachine: false,
    });

    expect(client.tag.create).toHaveBeenCalledTimes(2);
    expect(client.tag.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ kind: 'region', value: 'sahel', charStart: 0, charEnd: 10 }) });
    expect(client.tag.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ kind: 'region', value: 'north', charStart: 0, charEnd: 10 }) });
    expect(result.map((t) => t.value)).toEqual(['sahel', 'north']);
  });

  it('writes nothing for an empty region list', async () => {
    const client = makeClient();

    const result = await addRegionTags(client, {
      corpusItemId: 'item-1',
      regions: [],
      textLength: 10,
      annotatorId: 'user-1',
      isMachine: false,
    });

    expect(client.tag.create).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
