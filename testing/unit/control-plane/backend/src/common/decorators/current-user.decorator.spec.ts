import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../../../../../../../control-plane/backend/src/common/decorators/current-user.decorator';
import type { RequestUser } from '../../../../../../../control-plane/backend/src/common/guards/request-user.interface';

function extractParamFactory(target: object, key: string) {
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) ?? {};
  const entry = Object.values(metadata)[0] as { factory: (data: unknown, ctx: unknown) => unknown };
  return entry.factory;
}

describe('CurrentUser', () => {
  it('registers a factory that reads request.user off the execution context', () => {
    class Dummy {
      handler(@CurrentUser() _user?: RequestUser) {}
    }

    const factory = extractParamFactory(Dummy.prototype, 'handler');
    const user: RequestUser = { id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true };
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user }) }) };

    expect(factory(undefined, ctx)).toBe(user);
  });

  it('returns undefined when no user is attached to the request', () => {
    class Dummy {
      handler(@CurrentUser() _user?: RequestUser) {}
    }

    const factory = extractParamFactory(Dummy.prototype, 'handler');
    const ctx = { switchToHttp: () => ({ getRequest: () => ({}) }) };

    expect(factory(undefined, ctx)).toBeUndefined();
  });
});
