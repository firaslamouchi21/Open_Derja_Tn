import { isWithinLengthBounds } from '../../../../../../control-plane/backend/core/src/ingestion/length-filter';

describe('isWithinLengthBounds', () => {
  it('rejects text below the minimum token count', () => {
    expect(isWithinLengthBounds('aya labes')).toBe(false);
  });

  it('accepts text within bounds', () => {
    expect(isWithinLengthBounds('aya labes chnowa hwelek')).toBe(true);
  });

  it('rejects text above the maximum token count', () => {
    const tooLong = Array.from({ length: 501 }, () => 'kelma').join(' ');
    expect(isWithinLengthBounds(tooLong)).toBe(false);
  });

  it('accepts text at exactly the maximum token count', () => {
    const atMax = Array.from({ length: 500 }, () => 'kelma').join(' ');
    expect(isWithinLengthBounds(atMax)).toBe(true);
  });
});
