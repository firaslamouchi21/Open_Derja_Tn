import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AuthGuard } from '../../../../../../../control-plane/backend/src/common/guards/auth.guard';

function makeContext(request: Record<string, any>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function makeReflector(overrides: { isPublic?: boolean; allowUnverifiedEmail?: boolean }) {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === 'isPublic') return overrides.isPublic;
      if (key === 'allowUnverifiedEmail') return overrides.allowUnverifiedEmail;
      return undefined;
    }),
  } as unknown as Reflector;
}

const ACTIVE_USER = {
  id: 'u1',
  role: 'contributor',
  trustLevel: 0,
  emailConfirmed: true,
  active: true,
  tokenVersion: 1,
};

describe('AuthGuard', () => {
  it('lets an unauthenticated request through on a public route', async () => {
    const tokenService = { verifyAccessToken: jest.fn() };
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new AuthGuard(makeReflector({ isPublic: true }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: {} };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('attaches the resolved user on a public route when a valid bearer token is present', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', ver: 1, sid: 's1' }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(ACTIVE_USER) } };
    const guard = new AuthGuard(makeReflector({ isPublic: true }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer good-token' } };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true, sessionId: 's1' });
  });

  it('swallows a bad bearer token on a public route rather than failing the request', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockRejectedValue(new Error('bad token')) };
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new AuthGuard(makeReflector({ isPublic: true }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer bad-token' } };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('rejects a non-public request with no bearer token', async () => {
    const tokenService = { verifyAccessToken: jest.fn() };
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new AuthGuard(makeReflector({ isPublic: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: {} };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the token references a user that no longer exists', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'ghost' }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const guard = new AuthGuard(makeReflector({ isPublic: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(/Invalid session/);
  });

  it('rejects an inactive user even with a well-formed token', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1' }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ ...ACTIVE_USER, active: false }) } };
    const guard = new AuthGuard(makeReflector({ isPublic: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(/Invalid session/);
  });

  it('rejects a token whose version no longer matches the user (revoked)', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', ver: 5 }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ ...ACTIVE_USER, tokenVersion: 6 }) } };
    const guard = new AuthGuard(makeReflector({ isPublic: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(/revoked/);
  });

  it('rejects an unverified contributor when the route does not allow it', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', ver: 1 }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ ...ACTIVE_USER, emailConfirmed: false }) } };
    const guard = new AuthGuard(makeReflector({ isPublic: false, allowUnverifiedEmail: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('allows an unverified contributor when the route explicitly allows it', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', ver: 1 }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ ...ACTIVE_USER, emailConfirmed: false }) } };
    const guard = new AuthGuard(makeReflector({ isPublic: false, allowUnverifiedEmail: true }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
  });

  it('allows an unverified admin through regardless of the route decorator', async () => {
    const tokenService = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', ver: 1 }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ ...ACTIVE_USER, role: 'admin', emailConfirmed: false }) } };
    const guard = new AuthGuard(makeReflector({ isPublic: false, allowUnverifiedEmail: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
  });

  it('rejects a malformed authorization header (missing Bearer prefix)', async () => {
    const tokenService = { verifyAccessToken: jest.fn() };
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new AuthGuard(makeReflector({ isPublic: false }), tokenService as any, prisma as any);

    const request: Record<string, any> = { headers: { authorization: 'Basic abc123' } };
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });
});
