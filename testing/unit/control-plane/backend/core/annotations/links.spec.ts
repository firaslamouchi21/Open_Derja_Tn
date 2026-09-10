import { addLink } from '../../../../../../control-plane/backend/core/src/annotations/links';

describe('addLink', () => {
  it('creates a link with the given token, lexicon target, and provenance fields', async () => {
    const client = { link: { create: jest.fn().mockResolvedValue({ id: 'link-1' }) } } as any;

    await addLink(client, {
      tokenId: 'token-1',
      lexiconEntryId: 'entry-1',
      lexiconVariantId: 'variant-1',
      annotatorId: 'user-1',
      isMachine: false,
      confidence: 0.9,
    });

    expect(client.link.create).toHaveBeenCalledWith({
      data: {
        tokenId: 'token-1',
        lexiconEntryId: 'entry-1',
        lexiconVariantId: 'variant-1',
        annotatorId: 'user-1',
        isMachine: false,
        confidence: 0.9,
      },
    });
  });
});
