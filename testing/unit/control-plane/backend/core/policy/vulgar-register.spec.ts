import { corpusItemVulgarExclusionSql, lexiconVariantVulgarFilter } from '../../../../../../control-plane/backend/core/src/policy/vulgar-register';

describe('lexiconVariantVulgarFilter', () => {
  it('returns an empty where clause when vulgar entries are included', () => {
    expect(lexiconVariantVulgarFilter(true)).toEqual({});
  });

  it('excludes the vulgar register when vulgar entries are not included', () => {
    expect(lexiconVariantVulgarFilter(false)).toEqual({ register: { not: 'vulgar' } });
  });
});

describe('corpusItemVulgarExclusionSql', () => {
  it('produces no SQL fragment when vulgar entries are included', () => {
    const sql = corpusItemVulgarExclusionSql(true);
    expect(sql.strings.join('')).toBe('');
  });

  it('produces an exclusion fragment referencing the vulgar register tag when not included', () => {
    const sql = corpusItemVulgarExclusionSql(false);
    expect(sql.strings.join('')).toMatch(/NOT EXISTS/);
    expect(sql.strings.join('')).toMatch(/vulgar/);
  });
});
