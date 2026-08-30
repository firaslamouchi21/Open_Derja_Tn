import { createHash } from 'node:crypto';

export async function isPasswordBreached(password: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix && Number(count) > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
