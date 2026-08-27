import { matchesAnyMarker } from '../../../../../../control-plane/backend/core/src/ingestion/marker-filter';

describe('matchesAnyMarker', () => {
  it('matches everything when there are no markers configured', () => {
    expect(matchesAnyMarker('anything at all', [])).toBe(true);
  });

  it('matches when the text contains a marker word', () => {
    expect(matchesAnyMarker('barsha behi chnowa', ['chnowa'])).toBe(true);
  });

  it('does not match when none of the marker words are present', () => {
    expect(matchesAnyMarker('barsha behi', ['chnowa'])).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(matchesAnyMarker('CHNOWA hwelek', ['chnowa'])).toBe(true);
  });

  it('only matches whole words, not substrings', () => {
    expect(matchesAnyMarker('chnowaha', ['chnowa'])).toBe(false);
  });
});
