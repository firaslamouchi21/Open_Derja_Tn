import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../../../../../control-plane/backend/src/common/guards/roles.guard';
import type { RequestUser } from '../../../../../../../control-plane/backend/src/common/guards/request-user.interface';

function makeContext(user?: RequestUser) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function makeReflector(overrides: { isPublic?: boolean; roles?: string[] }) {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === 'isPublic') return overrides.isPublic;
      if (key === 'roles') return overrides.roles;
      return undefined;
    }),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows a public route through with no user at all', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: true }));
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('denies an unauthenticated request on a non-public route', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: false, roles: ['reviewer'] }));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('lets superadmin through even when no roles are declared', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: false, roles: undefined }));
    const user: RequestUser = { id: 'u1', role: 'superadmin', trustLevel: 0, emailConfirmed: true };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('denies by default when a non-superadmin route declares no roles', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: false, roles: undefined }));
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true };
    expect(() => guard.canActivate(makeContext(user))).toThrow(/deny by default/);
  });

  it('denies a user whose role is not in the required set', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: false, roles: ['reviewer', 'admin'] }));
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true };
    expect(() => guard.canActivate(makeContext(user))).toThrow(ForbiddenException);
  });

  it('allows a user whose role is in the required set', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: false, roles: ['reviewer', 'admin'] }));
    const user: RequestUser = { id: 'u1', role: 'reviewer', trustLevel: 0, emailConfirmed: true };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });
});
