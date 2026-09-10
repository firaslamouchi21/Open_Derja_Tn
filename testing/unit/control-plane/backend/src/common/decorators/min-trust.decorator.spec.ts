import { MIN_TRUST_KEY, MinTrust } from '../../../../../../../control-plane/backend/src/common/decorators/min-trust.decorator';

describe('MinTrust', () => {
  it('sets the MIN_TRUST_KEY metadata to the given level', () => {
    class Dummy {
      @MinTrust(2)
      handler() {}
    }
    expect(Reflect.getMetadata(MIN_TRUST_KEY, Dummy.prototype.handler)).toBe(2);
  });

  it('accepts a minimum trust level of 0', () => {
    class Dummy {
      @MinTrust(0)
      handler() {}
    }
    expect(Reflect.getMetadata(MIN_TRUST_KEY, Dummy.prototype.handler)).toBe(0);
  });
});
