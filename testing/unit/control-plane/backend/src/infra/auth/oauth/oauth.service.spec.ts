import { UnauthorizedException } from '@nestjs/common';
import { OAuthService } from '../../../../../../../../control-plane/backend/src/infra/auth/oauth/oauth.service';

function makeProvider(profile: unknown, configured = true) {
  return {
    name: 'github',
    isConfigured: () => configured,
    authorizeUrl: (s: string) => `https://gh/authorize?state=${s}`,
    fetchProfile: jest.fn().mockResolvedValue(profile),
  } as never;
}

const startSession = jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
const authService = { startSession } as never;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    authIdentity: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    reviewerInvite: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    $transaction: jest.fn().mockImplementation((cb) => cb({
      user: { create: jest.fn().mockResolvedValue({ id: 'new', role: 'reviewer', active: true }) },
      authIdentity: { create: jest.fn() },
      reviewerInvite: { update: jest.fn() },
    })),
    ...overrides,
  };
}

const verifiedProfile = { providerUserId: 'gh-1', email: 'r@example.com', emailVerified: true, displayName: 'R' };

function svc(prisma: unknown) {
  return new OAuthService(prisma as never, authService, makeProvider(verifiedProfile), makeProvider(verifiedProfile));
}

describe('OAuthService.resolveLogin — identity never grants a role on its own', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs in an existing linked identity', async () => {
    const prisma = makePrisma({
      authIdentity: {
        findUnique: jest.fn().mockResolvedValue({ user: { id: 'u1', role: 'reviewer', active: true } }),
        create: jest.fn(),
      },
    });
    await svc(prisma).resolveLogin('github', 'code', undefined, undefined);
    expect(startSession).toHaveBeenCalled();
  });

  it('links the provider to an existing user matched by verified email', async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2', role: 'admin', active: true }), create: jest.fn() },
    });
    await svc(prisma).resolveLogin('github', 'code', undefined, undefined);
    expect(prisma.authIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u2', provider: 'github' }) }),
    );
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      undefined,
      undefined,
      { twofaPending: true },
    );
  });

  it('creates a reviewer only when a matching open invite exists', async () => {
    const prisma = makePrisma({
      reviewerInvite: {
        findFirst: jest.fn().mockResolvedValue({ id: 'inv1', email: 'r@example.com', region: 'north' }),
        update: jest.fn(),
      },
    });
    await svc(prisma).resolveLogin('github', 'code', undefined, undefined);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects an un-invited identity — no account is created', async () => {
    const prisma = makePrisma();
    await expect(svc(prisma).resolveLogin('github', 'code', undefined, undefined)).rejects.toThrow(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects when the provider email is unverified', async () => {
    const prisma = makePrisma();
    const s = new OAuthService(
      prisma as never,
      authService,
      makeProvider({ ...verifiedProfile, emailVerified: false }),
      makeProvider(verifiedProfile),
    );
    await expect(s.resolveLogin('github', 'code', undefined, undefined)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unconfigured provider', async () => {
    const prisma = makePrisma();
    const s = new OAuthService(prisma as never, authService, makeProvider(verifiedProfile, false), makeProvider(verifiedProfile, false));
    await expect(s.resolveLogin('github', 'code', undefined, undefined)).rejects.toThrow(/not configured/);
  });
});
