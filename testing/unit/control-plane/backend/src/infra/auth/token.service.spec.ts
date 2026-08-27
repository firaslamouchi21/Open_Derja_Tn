import { TokenService } from '../../../../../../../control-plane/backend/src/infra/auth/token.service';

const ORIGINAL_ENV = process.env.AUTH_SECRET;

function withSecret<T>(secret: string | undefined, fn: () => T): T {
  if (secret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = secret;
  }
  try {
    return fn();
  } finally {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = ORIGINAL_ENV;
    }
  }
}

describe('TokenService construction', () => {
  it('refuses to construct with no AUTH_SECRET set', () => {
    withSecret(undefined, () => {
      expect(() => new TokenService()).toThrow(/AUTH_SECRET/);
    });
  });

  it('refuses to construct with an AUTH_SECRET shorter than 32 characters', () => {
    withSecret('too-short', () => {
      expect(() => new TokenService()).toThrow(/AUTH_SECRET/);
    });
  });

  it('constructs fine with a 32+ character AUTH_SECRET', () => {
    withSecret('a'.repeat(32), () => {
      expect(() => new TokenService()).not.toThrow();
    });
  });
});

describe('TokenService sign/verify roundtrip', () => {
  const service = withSecret('a'.repeat(32), () => new TokenService());

  it('round-trips an access token and rejects it as a refresh token', async () => {
    const token = await service.signAccessToken({ sub: 'u1', role: 'contributor', ver: 1, sid: 's1' });
    const payload = await service.verifyAccessToken(token);
    expect(payload).toMatchObject({ sub: 'u1', role: 'contributor', ver: 1, sid: 's1', typ: 'access' });
    await expect(service.verifyRefreshToken(token)).rejects.toThrow(/Not a refresh token/);
  });

  it('round-trips a refresh token and rejects it as an access token', async () => {
    const token = await service.signRefreshToken({ sub: 'u1', role: 'contributor', ver: 1, rjti: 'j1', sid: 's1' });
    const payload = await service.verifyRefreshToken(token);
    expect(payload).toMatchObject({ sub: 'u1', role: 'contributor', ver: 1, rjti: 'j1', sid: 's1', typ: 'refresh' });
    await expect(service.verifyAccessToken(token)).rejects.toThrow(/Not an access token/);
  });

  it('rejects a token signed with a different secret', async () => {
    const otherService = withSecret('b'.repeat(32), () => new TokenService());
    const token = await otherService.signAccessToken({ sub: 'u1', role: 'contributor', ver: 1 });
    await expect(service.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const token = await service.signAccessToken({ sub: 'u1', role: 'contributor', ver: 1 });
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'AA' ? 'BB' : 'AA');
    await expect(service.verifyAccessToken(tampered)).rejects.toThrow();
  });
});
