import { computeBackoffDelayMs, sleep } from './backoff';

export interface FetchWithBackoffOptions {
  userAgent: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([403, 429]);

export async function fetchWithBackoff(url: string, options: FetchWithBackoffOptions): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { headers: { 'User-Agent': options.userAgent } });
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await sleep(computeBackoffDelayMs(attempt, baseDelayMs));
      continue;
    }

    if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxAttempts) {
      await sleep(computeBackoffDelayMs(attempt, baseDelayMs));
      continue;
    }

    return response;
  }

  throw new Error(`fetchWithBackoff exhausted ${maxAttempts} attempts for ${url}`);
}
