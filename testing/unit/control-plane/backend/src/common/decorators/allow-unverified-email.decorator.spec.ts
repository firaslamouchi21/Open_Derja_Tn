import {
  ALLOW_UNVERIFIED_EMAIL_KEY,
  AllowUnverifiedEmail,
} from '../../../../../../../control-plane/backend/src/common/decorators/allow-unverified-email.decorator';

describe('AllowUnverifiedEmail', () => {
  it('sets the ALLOW_UNVERIFIED_EMAIL_KEY metadata to true on the decorated target', () => {
    class Dummy {
      @AllowUnverifiedEmail()
      handler() {}
    }
    expect(Reflect.getMetadata(ALLOW_UNVERIFIED_EMAIL_KEY, Dummy.prototype.handler)).toBe(true);
  });
});
