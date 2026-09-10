import { addLexiconOrigin } from '../../../../../../control-plane/backend/core/src/lexicon/origins';

function makeClient() {
  return { lexiconEntry: { findUnique: jest.fn() }, lexiconOrigin: { create: jest.fn() } } as any;
}

describe('addLexiconOrigin', () => {
  it('returns null without creating anything when the parent entry does not exist', async () => {
    const client = makeClient();
    client.lexiconEntry.findUnique.mockResolvedValue(null);

    const result = await addLexiconOrigin(client, 'ghost-entry', { origin: 'berber' as any });

    expect(result).toBeNull();
    expect(client.lexiconOrigin.create).not.toHaveBeenCalled();
  });

  it('always creates a new origin proposal in proposed status, regardless of who submitted it', async () => {
    const client = makeClient();
    client.lexiconEntry.findUnique.mockResolvedValue({ id: 'entry-1' });
    client.lexiconOrigin.create.mockResolvedValue({ id: 'origin-1', status: 'proposed' });

    await addLexiconOrigin(client, 'entry-1', { origin: 'berber' as any, sourceForm: 'x', proposedBy: 'user-1' });

    expect(client.lexiconOrigin.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lexiconEntryId: 'entry-1', origin: 'berber', status: 'proposed', proposedBy: 'user-1' }),
    });
  });
});
