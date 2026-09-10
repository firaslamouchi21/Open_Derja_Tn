export interface RobotsRule {
  path: string;
  allow: boolean;
}

export interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

export function parseRobotsTxt(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastField: string | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (field === 'user-agent') {
      if (!current || lastField !== 'user-agent') {
        current = { userAgents: [], rules: [] };
        groups.push(current);
      }
      current.userAgents.push(value.toLowerCase());
    } else if (field === 'disallow' && current && value !== '') {
      current.rules.push({ path: value, allow: false });
    } else if (field === 'allow' && current && value !== '') {
      current.rules.push({ path: value, allow: true });
    }

    lastField = field;
  }

  return groups;
}

function selectGroup(groups: RobotsGroup[], userAgent: string): RobotsGroup | undefined {
  const uaToken = userAgent.split('/')[0].trim().toLowerCase();
  const namedMatch = groups.find((group) => group.userAgents.some((ua) => ua !== '*' && uaToken.includes(ua)));
  if (namedMatch) return namedMatch;
  return groups.find((group) => group.userAgents.includes('*'));
}

export function isPathAllowed(groups: RobotsGroup[], userAgent: string, path: string): boolean {
  const group = selectGroup(groups, userAgent);
  if (!group) return true;

  let bestMatch: RobotsRule | undefined;
  for (const rule of group.rules) {
    if (path.startsWith(rule.path) && (!bestMatch || rule.path.length > bestMatch.path.length)) {
      bestMatch = rule;
    }
  }
  return bestMatch ? bestMatch.allow : true;
}

export async function isPathAllowedByRobotsTxt(robotsUrl: string, path: string, userAgent: string): Promise<boolean> {
  try {
    const response = await fetch(robotsUrl, { headers: { 'User-Agent': userAgent } });
    if (!response.ok) return true;
    const content = await response.text();
    return isPathAllowed(parseRobotsTxt(content), userAgent, path);
  } catch {
    return true;
  }
}
