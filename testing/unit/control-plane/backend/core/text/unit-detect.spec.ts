import { detectUnit } from '../../../../../../control-plane/backend/core/src/text/unit-detect';

describe('detectUnit', () => {
  it('treats a short run with no terminal punctuation as a phrase', () => {
    expect(detectUnit('chnowa hwelek')).toBe('phrase');
  });

  it('treats a longer run with a single terminal as a sentence', () => {
    expect(detectUnit('ken tema barsha nes fel forum, kolhom kifkif?')).toBe('sentence');
  });

  it('treats multiple terminals as a paragraph', () => {
    expect(detectUnit('Aya labes. Chnowa hwelek? Yezzi hkeya.')).toBe('paragraph');
  });

  it('treats a short phrase ending in punctuation as a sentence, not a phrase', () => {
    expect(detectUnit('barsha behi.')).toBe('sentence');
  });
});
