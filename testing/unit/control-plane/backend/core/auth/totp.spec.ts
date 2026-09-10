import {
  generateTotp,
  generateTotpSecret,
  totpAuthUri,
  verifyTotp,
} from '../../../../../../control-plane/backend/core/src/auth/totp';

describe('TOTP', () => {
  it('generates a base32 secret of usable length', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it('verifies a code it just generated', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, generateTotp(secret, now), now)).toBe(true);
  });

  it('accepts a code from the previous 30s step (clock skew window)', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const previous = generateTotp(secret, now - 30_000);
    expect(verifyTotp(secret, previous, now)).toBe(true);
  });

  it('rejects a code from two steps ago', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, generateTotp(secret, now - 90_000), now)).toBe(false);
  });

  it('rejects malformed input', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, 'abcdef')).toBe(false);
    expect(verifyTotp(secret, '12345')).toBe(false);
  });

  it('builds an otpauth URI carrying the secret and issuer', () => {
    const uri = totpAuthUri('ABC234', 'admin@example.com');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=ABC234');
    expect(uri).toContain('issuer=OpenDerja');
  });
});
