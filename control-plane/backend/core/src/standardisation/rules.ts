import type { Prisma, PrismaClient, Script, StandardisationRule } from '@open-derja/db';

export function getActiveStandardisationRules(
  client: PrismaClient | Prisma.TransactionClient,
  script: Script,
): Promise<StandardisationRule[]> {
  return client.standardisationRule.findMany({
    where: { active: true, script },
    orderBy: { ruleVersion: 'asc' },
  });
}

export function applyStandardisationRules(text: string, rules: StandardisationRule[]): string {
  let result = text;
  for (const rule of rules) {
    result = result.replace(new RegExp(rule.pattern, 'gu'), rule.replacement);
  }
  return result;
}

export function currentRuleVersion(rules: StandardisationRule[]): number {
  return rules.reduce((max, rule) => Math.max(max, rule.ruleVersion), 0);
}
