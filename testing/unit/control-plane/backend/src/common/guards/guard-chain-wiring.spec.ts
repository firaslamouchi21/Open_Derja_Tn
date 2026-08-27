import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../../../../../../../control-plane/backend/src/common/decorators/public.decorator';
import { Roles } from '../../../../../../../control-plane/backend/src/common/decorators/roles.decorator';
import { MinTrust } from '../../../../../../../control-plane/backend/src/common/decorators/min-trust.decorator';
import { AllowUnverifiedEmail } from '../../../../../../../control-plane/backend/src/common/decorators/allow-unverified-email.decorator';
import { RolesGuard } from '../../../../../../../control-plane/backend/src/common/guards/roles.guard';
import { TrustGuard } from '../../../../../../../control-plane/backend/src/common/guards/trust.guard';
import type { RequestUser } from '../../../../../../../control-plane/backend/src/common/guards/request-user.interface';

class FakeController {
  @Public()
  publicRoute() {}

  @Roles('reviewer', 'admin')
  reviewerRoute() {}

  @MinTrust(2)
  @AllowUnverifiedEmail()
  trustedRoute() {}

  noDecoratorsRoute() {}
}

function makeContext(handler: (...args: any[]) => any, user?: RequestUser) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => FakeController,
  } as any;
}

describe('real Reflector wired through the actual decorators', () => {
  const reflector = new Reflector();

  it('RolesGuard reads @Public() through the real Reflector and skips the role check', () => {
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(FakeController.prototype.publicRoute))).toBe(true);
  });

  it('RolesGuard reads @Roles(...) through the real Reflector and enforces it', () => {
    const guard = new RolesGuard(reflector);
    const contributor: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true };
    const reviewer: RequestUser = { id: 'u2', role: 'reviewer', trustLevel: 0, emailConfirmed: true };

    expect(() => guard.canActivate(makeContext(FakeController.prototype.reviewerRoute, contributor))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(makeContext(FakeController.prototype.reviewerRoute, reviewer))).toBe(true);
  });

  it('RolesGuard denies by default on a route with no @Public() and no @Roles()', () => {
    const guard = new RolesGuard(reflector);
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true };
    expect(() => guard.canActivate(makeContext(FakeController.prototype.noDecoratorsRoute, user))).toThrow(
      /deny by default/,
    );
  });

  it('TrustGuard reads @MinTrust(...) through the real Reflector and enforces it', () => {
    const guard = new TrustGuard(reflector);
    const belowThreshold: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 1, emailConfirmed: true };
    const atThreshold: RequestUser = { id: 'u2', role: 'contributor', trustLevel: 2, emailConfirmed: true };

    expect(() => guard.canActivate(makeContext(FakeController.prototype.trustedRoute, belowThreshold))).toThrow(
      /trust level 2/,
    );
    expect(guard.canActivate(makeContext(FakeController.prototype.trustedRoute, atThreshold))).toBe(true);
  });

  it('TrustGuard imposes no minimum on a route with no @MinTrust() at all', () => {
    const guard = new TrustGuard(reflector);
    expect(guard.canActivate(makeContext(FakeController.prototype.noDecoratorsRoute, undefined))).toBe(true);
  });
});
