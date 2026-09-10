import {
  computeMinHashSignature,
  estimateJaccardSimilarity,
  NEAR_DUPLICATE_THRESHOLD,
} from '../../../../../../control-plane/backend/core/src/ingestion/near-duplicate';

describe('computeMinHashSignature', () => {
  it('is deterministic for the same text', () => {
    const text = 'chnowa hwelek ya sahbi';
    expect(computeMinHashSignature(text)).toEqual(computeMinHashSignature(text));
  });

  it('produces one hash per hash function for any non-trivial text', () => {
    const signature = computeMinHashSignature('chnowa hwelek ya sahbi');
    expect(signature).toHaveLength(64);
  });

  it('produces different signatures for clearly different text', () => {
    const a = computeMinHashSignature('chnowa hwelek ya sahbi, kifeh ahwelek el yom');
    const b = computeMinHashSignature('completely unrelated english sentence about weather patterns');
    expect(estimateJaccardSimilarity(a, b)).toBeLessThan(NEAR_DUPLICATE_THRESHOLD);
  });
});

describe('estimateJaccardSimilarity', () => {
  it('returns 1 for identical signatures', () => {
    const sig = computeMinHashSignature('chnowa hwelek');
    expect(estimateJaccardSimilarity(sig, sig)).toBe(1);
  });

  it('returns 0 when signatures differ in length', () => {
    expect(estimateJaccardSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('returns 0 for two empty signatures', () => {
    expect(estimateJaccardSimilarity([], [])).toBe(0);
  });

  it('flags near-duplicate text (whitespace variation only) above the threshold', () => {
    const a = computeMinHashSignature('chnowa hwelek ya sahbi kifeh ahwelek');
    const b = computeMinHashSignature('chnowa   hwelek ya sahbi kifeh ahwelek');
    expect(estimateJaccardSimilarity(a, b)).toBeGreaterThanOrEqual(NEAR_DUPLICATE_THRESHOLD);
  });
});
