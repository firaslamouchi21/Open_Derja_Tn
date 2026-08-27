import { computeCanonicalMap, projectSpanOntoCanonical } from '../../../../../../control-plane/backend/core/src/standardisation/canonical-map';

describe('computeCanonicalMap', () => {
  it('records the rule version untouched', () => {
    const map = computeCanonicalMap('abc', 'abc', 4);
    expect(map.ruleVersion).toBe(4);
  });

  it('produces no segments beyond an identity match for identical text', () => {
    const map = computeCanonicalMap('chnowa', 'chnowa', 1);
    expect(map.segments).toEqual([{ originalStart: 0, originalEnd: 6, canonicalStart: 0, canonicalEnd: 6 }]);
  });

  it('captures a pure insertion as a zero-width original segment', () => {
    const map = computeCanonicalMap('ab', 'aXb', 1);
    const insertion = map.segments.find((s) => s.originalStart === s.originalEnd);
    expect(insertion).toEqual({ originalStart: 1, originalEnd: 1, canonicalStart: 1, canonicalEnd: 2 });
  });

  it('captures a pure deletion as a zero-width canonical segment', () => {
    const map = computeCanonicalMap('aXb', 'ab', 1);
    const deletion = map.segments.find((s) => s.canonicalStart === s.canonicalEnd);
    expect(deletion).toEqual({ originalStart: 1, originalEnd: 2, canonicalStart: 1, canonicalEnd: 1 });
  });
});

describe('projectSpanOntoCanonical', () => {
  it('maps a span 1:1 when original and canonical are identical', () => {
    const map = computeCanonicalMap('chnowa hwelek', 'chnowa hwelek', 1);
    expect(projectSpanOntoCanonical(map, 0, 6)).toEqual({ charStart: 0, charEnd: 6 });
  });

  it('shifts a span forward across an earlier insertion', () => {
    const map = computeCanonicalMap('ab cd', 'aXb cd', 1);
    expect(projectSpanOntoCanonical(map, 3, 5)).toEqual({ charStart: 4, charEnd: 6 });
  });

  it('returns undefined for a span with no overlapping segment', () => {
    const map = computeCanonicalMap('', 'abc', 1);
    expect(projectSpanOntoCanonical(map, 5, 6)).toBeUndefined();
  });
});
