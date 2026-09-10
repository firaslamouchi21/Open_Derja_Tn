import { computeTrustLevel } from '../../../../../../control-plane/backend/core/src/trust/recompute';

describe('computeTrustLevel (§6.4)', () => {
  it('is 0 for a brand-new contributor', () => {
    expect(computeTrustLevel({ approved: 0, rejected: 0, distinctTaskTypes: 0, emailConfirmed: false })).toBe(0);
  });

  it('is 1 at 3 approved entries', () => {
    expect(computeTrustLevel({ approved: 3, rejected: 0, distinctTaskTypes: 1, emailConfirmed: false })).toBe(1);
  });

  it('is 2 only with a verified email, 10+ approved and <10% rejected', () => {
    expect(computeTrustLevel({ approved: 10, rejected: 0, distinctTaskTypes: 1, emailConfirmed: true })).toBe(2);
    expect(computeTrustLevel({ approved: 10, rejected: 0, distinctTaskTypes: 1, emailConfirmed: false })).toBe(1);
    expect(computeTrustLevel({ approved: 10, rejected: 3, distinctTaskTypes: 1, emailConfirmed: true })).toBe(1);
  });

  it('is 3 with 10+ approved across 2+ task types and <5% rejected', () => {
    expect(computeTrustLevel({ approved: 20, rejected: 0, distinctTaskTypes: 2, emailConfirmed: true })).toBe(3);
    expect(computeTrustLevel({ approved: 20, rejected: 2, distinctTaskTypes: 2, emailConfirmed: true })).toBe(2);
    expect(computeTrustLevel({ approved: 20, rejected: 0, distinctTaskTypes: 1, emailConfirmed: true })).toBe(2);
  });
});
