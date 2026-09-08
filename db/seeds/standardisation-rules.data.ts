export const STANDARDISATION_RULE_VERSION = 1;

export interface StandardisationRuleSeed {
  pattern: string;
  replacement: string;
  script: 'arabic' | 'latin';
  description?: string;
}

export const STANDARDISATION_RULE_SEEDS: StandardisationRuleSeed[] = [];
