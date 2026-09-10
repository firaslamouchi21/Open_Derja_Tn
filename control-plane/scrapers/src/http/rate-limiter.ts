import { sleep } from './backoff';

export function minIntervalMsFromRateLimit(requestsPerMinute: number | null | undefined): number {
  if (!requestsPerMinute || requestsPerMinute <= 0) return 0;
  return Math.ceil(60000 / requestsPerMinute);
}

export class RateLimiter {
  private lastCallAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async wait(): Promise<void> {
    if (this.minIntervalMs <= 0) return;

    const elapsed = Date.now() - this.lastCallAt;
    const remaining = this.minIntervalMs - elapsed;
    if (remaining > 0) await sleep(remaining);
    this.lastCallAt = Date.now();
  }
}
