import { createLexiconForm } from '../../../../../../control-plane/backend/core/src/lexicon/forms';

function makeClient() {
  return { lexiconVariant: { findUnique: jest.fn() }, lexiconForm: { create: jest.fn() } } as any;
}

describe('createLexiconForm', () => {
  it('returns null without creating anything when the parent variant does not exist', async () => {
    const client = makeClient();
    client.lexiconVariant.findUnique.mockResolvedValue(null);

    const result = await createLexiconForm(client, 'ghost-variant', { text: 'شنوة', script: 'arabic', isMachine: false });

    expect(result).toBeNull();
    expect(client.lexiconForm.create).not.toHaveBeenCalled();
  });

  it('marks a human-authored form canonical', async () => {
    const client = makeClient();
    client.lexiconVariant.findUnique.mockResolvedValue({ id: 'variant-1' });
    client.lexiconForm.create.mockResolvedValue({ id: 'form-1' });

    await createLexiconForm(client, 'variant-1', { text: 'شنوة', script: 'arabic', isMachine: false });

    expect(client.lexiconForm.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lexiconVariantId: 'variant-1', matchKey: 'شنوه', isCanonical: true }),
    });
  });

  it('marks a machine-authored form non-canonical', async () => {
    const client = makeClient();
    client.lexiconVariant.findUnique.mockResolvedValue({ id: 'variant-1' });
    client.lexiconForm.create.mockResolvedValue({ id: 'form-1' });

    await createLexiconForm(client, 'variant-1', { text: 'شنوة', script: 'arabic', isMachine: true });

    expect(client.lexiconForm.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isCanonical: false }) }));
  });
});
