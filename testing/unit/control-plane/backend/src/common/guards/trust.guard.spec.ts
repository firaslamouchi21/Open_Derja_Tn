import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { TrustGuard } from '../../../../../../../control-plane/backend/src/common/guards/trust.guard';
import type { RequestUser } from '../../../../../../../control-plane/backend/src/common/guards/request-user.interface';

function makeContext(user?: RequestUser) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function makeReflector(overrides: { isPublic?: boolean; minTrust?: number }) {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === 'isPublic') return overrides.isPublic;
      if (key === 'minTrust') return overrides.minTrust;
      return undefined;
    }),
  } as unknown as Reflector;
}

describe('TrustGuard', () => {
  it('allows a public route through with no user', () => {
    const guard = new TrustGuard(makeReflector({ isPublic: true }));
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows any request when the route declares no minimum trust', () => {
    const guard = new TrustGuard(makeReflector({ isPublic: false, minTrust: undefined }));
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('denies an unauthenticated request when a minimum trust is declared', () => {
    const guard = new TrustGuard(makeReflector({ isPublic: false, minTrust: 1 }));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('denies a user below the required trust level', () => {
    const guard = new TrustGuard(makeReflector({ isPublic: false, minTrust: 2 }));
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 1, emailConfirmed: true };
    expect(() => guard.canActivate(makeContext(user))).toThrow(/trust level 2/);
  });

  it('allows a user exactly at the required trust level', () => {
    const guard = new TrustGuard(makeReflector({ isPublic: false, minTrust: 2 }));
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 2, emailConfirmed: true };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('allows a user above the required trust level', () => {
    const guard = new TrustGuard(makeReflector({ isPublic: false, minTrust: 1 }));
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 5, emailConfirmed: true };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });
});
