import { ROLES_KEY, Roles } from '../../../../../../../control-plane/backend/src/common/decorators/roles.decorator';

describe('Roles', () => {
  it('sets the ROLES_KEY metadata to the given role list', () => {
    class Dummy {
      @Roles('reviewer', 'admin')
      handler() {}
    }
    expect(Reflect.getMetadata(ROLES_KEY, Dummy.prototype.handler)).toEqual(['reviewer', 'admin']);
  });

  it('sets an empty array when called with no roles', () => {
    class Dummy {
      @Roles()
      handler() {}
    }
    expect(Reflect.getMetadata(ROLES_KEY, Dummy.prototype.handler)).toEqual([]);
  });
});
