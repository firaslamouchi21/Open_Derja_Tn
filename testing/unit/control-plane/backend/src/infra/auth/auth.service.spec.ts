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

describe('AuthService.register', () => {
  it('rejects registration when the email is already taken', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }), create: jest.fn() } };
    const service = new AuthService(prisma as any, makeTokenService() as any);

    await expect(
      service.register({ email: 'taken@example.com', password: 'password1234', displayName: 'x' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a contributor with a hashed password, never the plaintext', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new-user', ...data })),
      },
    };
    const service = new AuthService(prisma as any, makeTokenService() as any);

    const result = await service.register({ email: 'new@example.com', password: 'password1234', displayName: 'x' });

    expect(result).toEqual({ id: 'new-user', email: 'new@example.com', role: 'contributor' });
    const createCall = prisma.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).not.toBe('password1234');
    expect(createCall.data.role).toBe('contributor');
    expect(createCall.data.emailConfirmed).toBe(false);
  });
});

describe('AuthService.refresh (CSRF check)', () => {
  it('rejects when the CSRF header is missing', async () => {
    const service = new AuthService({} as any, makeTokenService() as any);
    await expect(service.refresh('rt', undefined, 'cookie-value')).rejects.toThrow(/CSRF/);
  });

  it('rejects when the CSRF cookie is missing', async () => {
    const service = new AuthService({} as any, makeTokenService() as any);
    await expect(service.refresh('rt', 'header-value', undefined)).rejects.toThrow(/CSRF/);
  });

  it('rejects when the CSRF header and cookie do not match', async () => {
    const service = new AuthService({} as any, makeTokenService() as any);
    await expect(service.refresh('rt', 'aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb')).rejects.toThrow(/CSRF token mismatch/);
  });

  it('proceeds past the CSRF check when header and cookie match, failing later on an invalid refresh token', async () => {
    const tokenService = makeTokenService();
    tokenService.verifyRefreshToken.mockRejectedValue(new Error('bad token'));
    const service = new AuthService({} as any, tokenService as any);

    await expect(service.refresh('rt', 'same-value', 'same-value')).rejects.toThrow(UnauthorizedException);
    expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('rt');
  });
});
