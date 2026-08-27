import { cleanText } from '../../../../../../control-plane/backend/core/src/ingestion/clean';

describe('cleanText', () => {
  it('strips URLs', () => {
    expect(cleanText('chouf https://example.com/foo bahi')).toBe('chouf bahi');
  });

  it('strips @mentions', () => {
    expect(cleanText('salut @firas ça va')).toBe('salut ça va');
  });

  it('strips emoji', () => {
    expect(cleanText('mrigla 😂🔥 barsha')).toBe('mrigla barsha');
  });

  it('collapses horizontal whitespace but preserves newlines', () => {
    expect(cleanText('a   b\tc')).toBe('a b c');
  });

  it('collapses three or more blank lines down to one blank line', () => {
    expect(cleanText('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims the result', () => {
    expect(cleanText('   hello   ')).toBe('hello');
  });
});
