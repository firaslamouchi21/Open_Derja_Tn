import { createSourceRunner } from '../../../../../control-plane/scrapers/src/sources/registry';

describe('createSourceRunner', () => {
  it('returns a runner for a wikipedia source', () => {
    const runner = createSourceRunner({ id: 's1', kind: 'wikipedia', url: null, rateLimit: null } as any);
    expect(runner).toHaveProperty('fetch');
    expect(typeof runner.fetch).toBe('function');
  });

  it('throws for a source kind with no runner implemented yet', () => {
    expect(() => createSourceRunner({ id: 's2', kind: 'forum', url: null, rateLimit: null } as any)).toThrow(
      /No scraper implemented yet for source kind "forum"/,
    );
  });
});
