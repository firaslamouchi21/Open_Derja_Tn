import { computeMatchKey } from '../../../../../../control-plane/backend/core/src/text/match-key';

describe('computeMatchKey', () => {
  it('normalises alef variants to plain alef', () => {
    expect(computeMatchKey('أنا أنا آنا ٱنا')).toBe(computeMatchKey('انا انا انا انا'));
  });

  it('normalises taa marbuta to haa', () => {
    expect(computeMatchKey('مدرسة')).toBe(computeMatchKey('مدرسه'));
  });

  it('normalises alef maqsura to yaa', () => {
    expect(computeMatchKey('على')).toBe(computeMatchKey('علي'));
  });

  it('strips diacritics', () => {
    expect(computeMatchKey('كَتَبَ')).toBe(computeMatchKey('كتب'));
  });

  it('strips tatweel', () => {
    expect(computeMatchKey('كـــتب')).toBe(computeMatchKey('كتب'));
  });

  it('converts Arabic-Indic digits to Latin digits', () => {
    expect(computeMatchKey('٠١٢٣')).toBe('0123');
  });

  it('trims and lowercases the result', () => {
    expect(computeMatchKey('  HELLO  ')).toBe('hello');
  });
});
