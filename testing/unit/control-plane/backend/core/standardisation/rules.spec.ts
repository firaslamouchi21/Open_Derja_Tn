import { applyStandardisationRules, currentRuleVersion } from '../../../../../../control-plane/backend/core/src/standardisation/rules';

function rule(pattern: string, replacement: string, ruleVersion: number) {
  return { pattern, replacement, ruleVersion } as any;
}

describe('applyStandardisationRules', () => {
  it('returns the input unchanged when there are no rules', () => {
    expect(applyStandardisationRules('chnowa hwelek', [])).toBe('chnowa hwelek');
  });

  it('applies a single rule as a global regex replacement', () => {
    const result = applyStandardisationRules('chnowa chnowa', [rule('chnowa', 'شنوة', 1)]);
    expect(result).toBe('شنوة شنوة');
  });

  it('applies multiple rules in order, each seeing the previous result', () => {
    const rules = [rule('a', 'b', 1), rule('b', 'c', 2)];
    expect(applyStandardisationRules('aaa', rules)).toBe('ccc');
  });
});

describe('currentRuleVersion', () => {
  it('returns 0 for an empty rule set', () => {
    expect(currentRuleVersion([])).toBe(0);
  });

  it('returns the highest rule version present', () => {
    const rules = [rule('a', 'b', 3), rule('c', 'd', 7), rule('e', 'f', 5)];
    expect(currentRuleVersion(rules)).toBe(7);
  });
});
