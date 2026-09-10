import { isPathAllowed, parseRobotsTxt } from '../../../../../control-plane/scrapers/src/http/robots';

describe('parseRobotsTxt', () => {
  it('parses a single wildcard group with disallow rules', () => {
    const groups = parseRobotsTxt(['User-agent: *', 'Disallow: /admin', 'Disallow: /private'].join('\n'));

    expect(groups).toEqual([{ userAgents: ['*'], rules: [{ path: '/admin', allow: false }, { path: '/private', allow: false }] }]);
  });

  it('ignores comments and blank lines', () => {
    const groups = parseRobotsTxt(['# comment', '', 'User-agent: *', '# another comment', 'Disallow: /admin', ''].join('\n'));

    expect(groups).toEqual([{ userAgents: ['*'], rules: [{ path: '/admin', allow: false }] }]);
  });

  it('starts a new group per consecutive user-agent block', () => {
    const groups = parseRobotsTxt(
      ['User-agent: BadBot', 'Disallow: /', '', 'User-agent: *', 'Disallow: /admin'].join('\n'),
    );

    expect(groups).toEqual([
      { userAgents: ['badbot'], rules: [{ path: '/', allow: false }] },
      { userAgents: ['*'], rules: [{ path: '/admin', allow: false }] },
    ]);
  });

  it('treats an empty disallow value as allow-all rather than a rule', () => {
    const groups = parseRobotsTxt(['User-agent: *', 'Disallow:'].join('\n'));

    expect(groups).toEqual([{ userAgents: ['*'], rules: [] }]);
  });
});

describe('isPathAllowed', () => {
  it('allows any path when there are no groups at all', () => {
    expect(isPathAllowed([], 'OpenDerjaTN-Scraper/0.1', '/w/api.php')).toBe(true);
  });

  it('disallows a path matched by a wildcard group rule', () => {
    const groups = parseRobotsTxt(['User-agent: *', 'Disallow: /admin'].join('\n'));
    expect(isPathAllowed(groups, 'OpenDerjaTN-Scraper/0.1', '/admin/panel')).toBe(false);
    expect(isPathAllowed(groups, 'OpenDerjaTN-Scraper/0.1', '/w/api.php')).toBe(true);
  });

  it('prefers the more specific rule when allow and disallow overlap', () => {
    const groups = parseRobotsTxt(['User-agent: *', 'Disallow: /w/', 'Allow: /w/api.php'].join('\n'));
    expect(isPathAllowed(groups, 'OpenDerjaTN-Scraper/0.1', '/w/api.php')).toBe(true);
    expect(isPathAllowed(groups, 'OpenDerjaTN-Scraper/0.1', '/w/index.php')).toBe(false);
  });

  it('prefers a named user-agent group over the wildcard group', () => {
    const groups = parseRobotsTxt(
      ['User-agent: openderjatn-scraper', 'Disallow:', '', 'User-agent: *', 'Disallow: /'].join('\n'),
    );
    expect(isPathAllowed(groups, 'OpenDerjaTN-Scraper/0.1', '/anything')).toBe(true);
  });
});
