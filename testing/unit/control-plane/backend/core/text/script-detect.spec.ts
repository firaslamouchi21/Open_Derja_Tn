import { detectScript } from '../../../../../../control-plane/backend/core/src/text/script-detect';

describe('detectScript', () => {
  it('detects pure Arabic script', () => {
    expect(detectScript('شنوة حالك')).toBe('arabic');
  });

  it('detects pure Latin script (Arabizi)', () => {
    expect(detectScript('chnowa hwelek')).toBe('latin');
  });

  it('detects mixed script when both are present', () => {
    expect(detectScript('chnowa شنوة')).toBe('mixed');
  });

  it('falls back to latin for text with neither script', () => {
    expect(detectScript('123 !!!')).toBe('latin');
  });
});
