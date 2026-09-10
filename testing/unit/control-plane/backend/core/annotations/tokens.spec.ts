import { addToken } from '../../../../../../control-plane/backend/core/src/annotations/tokens';

describe('addToken', () => {
  it('creates a token at the given span with its provenance fields', async () => {
    const client = { token: { create: jest.fn().mockResolvedValue({ id: 'token-1' }) } } as any;

    await addToken(client, {
      corpusItemId: 'item-1',
      charStart: 0,
      charEnd: 5,
      surfaceText: 'chnowa',
      annotatorId: 'user-1',
      isMachine: true,
    });

    expect(client.token.create).toHaveBeenCalledWith({
      data: {
        corpusItemId: 'item-1',
        charStart: 0,
        charEnd: 5,
        surfaceText: 'chnowa',
        annotatorId: 'user-1',
        isMachine: true,
        confidence: undefined,
      },
    });
  });
});
