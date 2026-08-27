import { getTranslatorCoverage } from '../../../../../../control-plane/backend/core/src/translate/coverage';

describe('getTranslatorCoverage', () => {
  it('reports the lexicon variant count and the sentence-unit corpus item count', async () => {
    const client = {
      lexiconVariant: { count: jest.fn().mockResolvedValue(120) },
      corpusItem: { count: jest.fn().mockResolvedValue(45) },
    } as any;

    const result = await getTranslatorCoverage(client);

    expect(client.corpusItem.count).toHaveBeenCalledWith({ where: { unit: 'sentence' } });
    expect(result).toEqual({ wordCount: 120, sentenceCount: 45 });
  });
});
