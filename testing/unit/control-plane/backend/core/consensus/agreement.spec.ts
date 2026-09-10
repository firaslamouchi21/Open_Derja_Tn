import { computeAgreement, CONSENSUS_THRESHOLD } from '../../../../../../control-plane/backend/core/src/consensus/agreement';

describe('computeAgreement', () => {
  it('returns full agreement with no adjudication needed when there are no annotators', () => {
    const result = computeAgreement(new Map());
    expect(result).toEqual({ agreedValues: [], allValues: [], agreement: 1, annotatorN: 0, needsAdjudication: false });
  });

  it('returns full agreement for a single annotator', () => {
    const values = new Map([['annotator-1', new Set(['sahel'])]]);
    const result = computeAgreement(values);
    expect(result.agreement).toBe(1);
    expect(result.agreedValues).toEqual(['sahel']);
    expect(result.needsAdjudication).toBe(false);
  });

  it('reports full agreement when all annotators pick the same value', () => {
    const values = new Map([
      ['a1', new Set(['sahel'])],
      ['a2', new Set(['sahel'])],
    ]);
    const result = computeAgreement(values);
    expect(result.agreement).toBe(1);
    expect(result.agreedValues).toEqual(['sahel']);
    expect(result.needsAdjudication).toBe(false);
  });

  it('flags adjudication when annotators fully disagree', () => {
    const values = new Map([
      ['a1', new Set(['sahel'])],
      ['a2', new Set(['north'])],
    ]);
    const result = computeAgreement(values);
    expect(result.agreement).toBe(0);
    expect(result.agreedValues).toEqual([]);
    expect(result.allValues.sort()).toEqual(['north', 'sahel']);
    expect(result.needsAdjudication).toBe(true);
  });

  it('needs adjudication exactly when agreement drops below the threshold', () => {
    const values = new Map([
      ['a1', new Set(['sahel', 'north'])],
      ['a2', new Set(['sahel'])],
    ]);
    const result = computeAgreement(values);
    expect(result.agreement).toBe(0.5);
    expect(CONSENSUS_THRESHOLD).toBe(0.6);
    expect(result.needsAdjudication).toBe(true);
  });

  it('averages pairwise jaccard similarity across more than two annotators', () => {
    const values = new Map([
      ['a1', new Set(['sahel'])],
      ['a2', new Set(['sahel'])],
      ['a3', new Set(['north'])],
    ]);
    const result = computeAgreement(values);
    expect(result.annotatorN).toBe(3);
    expect(result.agreement).toBeCloseTo(0.33, 2);
    expect(result.needsAdjudication).toBe(true);
  });
});
