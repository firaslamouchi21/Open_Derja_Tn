import { RateLimiter, minIntervalMsFromRateLimit } from '../../../../../control-plane/scrapers/src/http/rate-limiter';

describe('minIntervalMsFromRateLimit', () => {
  it('returns 0 when no rate limit is configured', () => {
    expect(minIntervalMsFromRateLimit(null)).toBe(0);
    expect(minIntervalMsFromRateLimit(undefined)).toBe(0);
    expect(minIntervalMsFromRateLimit(0)).toBe(0);
  });

  it('converts requests-per-minute into a minimum interval in milliseconds', () => {
    expect(minIntervalMsFromRateLimit(60)).toBe(1000);
    expect(minIntervalMsFromRateLimit(30)).toBe(2000);
  });
});

describe('RateLimiter', () => {
  it('does not delay the first call', async () => {
    const limiter = new RateLimiter(1000);
    const start = Date.now();
    await limiter.wait();
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('does not delay when configured with no minimum interval', async () => {
    const limiter = new RateLimiter(0);
    const start = Date.now();
    await limiter.wait();
    await limiter.wait();
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('delays a second call until the minimum interval has elapsed', async () => {
    const limiter = new RateLimiter(200);
    const start = Date.now();
    await limiter.wait();
    await limiter.wait();
    expect(Date.now() - start).toBeGreaterThanOrEqual(190);
  });
});
