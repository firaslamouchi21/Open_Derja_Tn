import { createTranslation } from '../../../../../../control-plane/backend/core/src/translate/translations';

function makeClient() {
  return { translation: { create: jest.fn() } } as any;
}

describe('createTranslation', () => {
  it('marks a human translation preferred, sourced as human', async () => {
    const client = makeClient();
    client.translation.create.mockResolvedValue({ id: 't1' });

    await createTranslation(client, { corpusItemId: 'item-1', targetLang: 'fr', text: 'bonjour', translatorId: 'user-1', isMachine: false });

    expect(client.translation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'human', isPreferred: true }),
    });
  });

  it('marks a machine translation as a non-preferred llm draft', async () => {
    const client = makeClient();
    client.translation.create.mockResolvedValue({ id: 't1' });

    await createTranslation(client, { corpusItemId: 'item-1', targetLang: 'fr', text: 'bonjour', translatorId: 'model-1', isMachine: true });

    expect(client.translation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'llm_draft', isPreferred: false }),
    });
  });
});
