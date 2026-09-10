import { attestLexiconVariantRegion, createLexiconVariant, lexiconVariantExists } from '../../../../../../control-plane/backend/core/src/lexicon/variants';

function makeClient() {
  return {
    lexiconEntry: { findUnique: jest.fn() },
    lexiconVariant: { create: jest.fn(), findUnique: jest.fn() },
    lexiconVariantRegion: { upsert: jest.fn() },
  } as any;
}

const VARIANT_PARAMS = { scope: 'regional' as const, era: 'contemporary' as any, setting: 'informal' as any, register: 'neutral' as any, canonicalForm: 'chnowa' };

describe('createLexiconVariant', () => {
  it('returns null without creating anything when the parent entry does not exist', async () => {
    const client = makeClient();
    client.lexiconEntry.findUnique.mockResolvedValue(null);

    const result = await createLexiconVariant(client, 'ghost-entry', VARIANT_PARAMS);

    expect(result).toBeNull();
    expect(client.lexiconVariant.create).not.toHaveBeenCalled();
  });

  it('creates the variant with a computed match key when the parent entry exists', async () => {
    const client = makeClient();
    client.lexiconEntry.findUnique.mockResolvedValue({ id: 'entry-1' });
    client.lexiconVariant.create.mockResolvedValue({ id: 'variant-1' });

    const result = await createLexiconVariant(client, 'entry-1', VARIANT_PARAMS);

    expect(client.lexiconVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lexiconEntryId: 'entry-1', canonicalForm: 'chnowa', matchKey: 'chnowa' }),
    });
    expect(result).toEqual({ id: 'variant-1' });
  });
});

describe('lexiconVariantExists', () => {
  it('is true when a row is found and false otherwise', async () => {
    const client = makeClient();
    client.lexiconVariant.findUnique.mockResolvedValueOnce({ id: 'v1' });
    await expect(lexiconVariantExists(client, 'v1')).resolves.toBe(true);

    client.lexiconVariant.findUnique.mockResolvedValueOnce(null);
    await expect(lexiconVariantExists(client, 'ghost')).resolves.toBe(false);
  });
});

describe('attestLexiconVariantRegion', () => {
  it('returns null without upserting when the variant does not exist', async () => {
    const client = makeClient();
    client.lexiconVariant.findUnique.mockResolvedValue(null);

    const result = await attestLexiconVariantRegion(client, 'ghost-variant', 'sahel');

    expect(result).toBeNull();
    expect(client.lexiconVariantRegion.upsert).not.toHaveBeenCalled();
  });

  it('creates a fresh attestation count of 1 for a first-time region', async () => {
    const client = makeClient();
    client.lexiconVariant.findUnique.mockResolvedValue({ id: 'variant-1' });
    client.lexiconVariantRegion.upsert.mockResolvedValue({ attestationCount: 1 });

    await attestLexiconVariantRegion(client, 'variant-1', 'sahel');

    expect(client.lexiconVariantRegion.upsert).toHaveBeenCalledWith({
      where: { lexiconVariantId_region: { lexiconVariantId: 'variant-1', region: 'sahel' } },
      create: { lexiconVariantId: 'variant-1', region: 'sahel', attestationCount: 1 },
      update: { attestationCount: { increment: 1 } },
    });
  });
});
