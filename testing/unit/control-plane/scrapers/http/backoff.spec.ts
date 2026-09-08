import { computeBackoffDelayMs } from '../../../../../control-plane/scrapers/src/http/backoff';

describe('computeBackoffDelayMs', () => {
  it('returns the base delay on the first attempt', () => {
    expect(computeBackoffDelayMs(1, 1000)).toBe(1000);
  });

  it('doubles the delay on each subsequent attempt', () => {
    expect(computeBackoffDelayMs(2, 1000)).toBe(2000);
    expect(computeBackoffDelayMs(3, 1000)).toBe(4000);
    expect(computeBackoffDelayMs(4, 1000)).toBe(8000);
  });

  it('scales with a different base delay', () => {
    expect(computeBackoffDelayMs(3, 500)).toBe(2000);
  });
});
