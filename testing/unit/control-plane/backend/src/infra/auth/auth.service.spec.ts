import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService, hashIp } from '../../../../../../../control-plane/backend/src/infra/auth/auth.service';

describe('hashIp', () => {
  it('is deterministic for the same IP', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  });

  it('produces different hashes for different IPs', () => {
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('5.6.7.8'));
  });

  it('never returns the raw IP', () => {
    expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
  });
});

function makeTokenService() {
  return {
    signAccessToken: jest.fn().mockResolvedValue('access-token'),
    signRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    verifyRefreshToken: jest.fn(),
  };
}

function makeEmailOtp() {
  return { issue: jest.fn().mockResolvedValue(undefined), consume: jest.fn().mockResolvedValue(undefined) };
}

function makeTotp() {
  return { assertCode: jest.fn().mockResolvedValue(undefined) };
}

function mkService(prisma: unknown, tokenService: unknown = makeTokenService()) {
  return new AuthService(prisma as any, tokenService as any, makeEmailOtp() as any, makeTotp() as any);
}

describe('AuthService.register', () => {
  it('rejects registration when the email is already taken', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }) }, $transaction: jest.fn() };
    const service = mkService(prisma);

    await expect(
      service.register({ email: 'taken@example.com', password: 'password1234', displayName: 'x' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a contributor with a hashed password, never the plaintext', async () => {
    const userCreate = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new-user', ...data }));
    const tx = { user: { create: userCreate }, authIdentity: { create: jest.fn() } };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    };
    const service = mkService(prisma);

    const result = await service.register({ email: 'new@example.com', password: 'password1234', displayName: 'x' });

    expect(result).toEqual({ id: 'new-user', email: 'new@example.com', role: 'contributor' });
    const createCall = userCreate.mock.calls[0][0];
    expect(createCall.data.passwordHash).not.toBe('password1234');
    expect(createCall.data.role).toBe('contributor');
    expect(createCall.data.emailConfirmed).toBe(false);
    expect(tx.authIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ provider: 'password' }) }),
    );
  });
});

describe('AuthService.guestSession', () => {
  function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
      refreshSession: { create: jest.fn().mockResolvedValue({ id: 'session-row-1', jti: 'jti-1' }) },
      ...overrides,
    };
  }

  it('creates a brand-new contributor for a session id never seen before', async () => {
    const prisma: any = makePrisma();
    prisma.user.create.mockResolvedValue({
      id: 'sess-1',
      role: 'contributor',
      tokenVersion: 0,
      active: true,
    });
    const service = mkService(prisma);

    const tokens = await service.guestSession('sess-1', 'iphash', 'ua');

    expect(prisma.user.create).toHaveBeenCalledWith({ data: { id: 'sess-1', role: 'contributor' } });
    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(prisma.refreshSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'sess-1' }) }),
    );
  });

  it('reuses the existing contributor for a session id already seen', async () => {
    const prisma: any = makePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sess-1', role: 'contributor', tokenVersion: 0, active: true }),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    });
    const service = mkService(prisma);

    await service.guestSession('sess-1', 'iphash', 'ua');

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuses to issue a session when the id already belongs to a non-contributor role', async () => {
    const prisma: any = makePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'admin-id', role: 'admin', tokenVersion: 0, active: true }),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    });
    const service = mkService(prisma);

    await expect(service.guestSession('admin-id', 'iphash', 'ua')).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.refreshSession.create).not.toHaveBeenCalled();
  });

  it('refuses to issue a session for a deactivated contributor', async () => {
    const prisma: any = makePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sess-1', role: 'contributor', tokenVersion: 0, active: false }),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    });
    const service = mkService(prisma);

    await expect(service.guestSession('sess-1', 'iphash', 'ua')).rejects.toThrow(UnauthorizedException);
  });

  it('re-fetches and re-checks the role when a concurrent create loses the race', async () => {
    const prisma: any = makePrisma();
    prisma.user.create.mockRejectedValue(new Error('unique constraint'));
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'sess-1', role: 'contributor', tokenVersion: 0, active: true });
    const service = mkService(prisma);

    const tokens = await service.guestSession('sess-1', 'iphash', 'ua');

    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
  });

  it('refuses even after losing the create race if the winning row is not a contributor', async () => {
    const prisma: any = makePrisma();
    prisma.user.create.mockRejectedValue(new Error('unique constraint'));
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'sess-1', role: 'reviewer', tokenVersion: 0, active: true });
    const service = mkService(prisma);

    await expect(service.guestSession('sess-1', 'iphash', 'ua')).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.refresh (CSRF check)', () => {
  it('rejects when the CSRF header is missing', async () => {
    const service = mkService({});
    await expect(service.refresh('rt', undefined, 'cookie-value')).rejects.toThrow(/CSRF/);
  });

  it('rejects when the CSRF cookie is missing', async () => {
    const service = mkService({});
    await expect(service.refresh('rt', 'header-value', undefined)).rejects.toThrow(/CSRF/);
  });

  it('rejects when the CSRF header and cookie do not match', async () => {
    const service = mkService({});
    await expect(service.refresh('rt', 'aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb')).rejects.toThrow(/CSRF token mismatch/);
  });

  it('proceeds past the CSRF check when header and cookie match, failing later on an invalid refresh token', async () => {
    const tokenService = makeTokenService();
    tokenService.verifyRefreshToken.mockRejectedValue(new Error('bad token'));
    const service = mkService({}, tokenService);

    await expect(service.refresh('rt', 'same-value', 'same-value')).rejects.toThrow(UnauthorizedException);
    expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('rt');
  });
});
