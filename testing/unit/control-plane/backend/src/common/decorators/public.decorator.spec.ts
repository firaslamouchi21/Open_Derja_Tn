import { IS_PUBLIC_KEY, Public } from '../../../../../../../control-plane/backend/src/common/decorators/public.decorator';

describe('Public', () => {
  it('sets the IS_PUBLIC_KEY metadata to true on the decorated target', () => {
    class Dummy {
      @Public()
      handler() {}
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Dummy.prototype.handler)).toBe(true);
  });
});
