import { getClaimableTaskRole, getEligibleTaskTypes } from '../../../../../../control-plane/backend/core/src/trust/eligible-task-types';

describe('getEligibleTaskTypes', () => {
  it('gives a trust-0 contributor only confirm tasks', () => {
    expect(getEligibleTaskTypes({ role: 'contributor', trustLevel: 0 })).toEqual(['confirm']);
  });

  it('adds region_tag at trust level 1', () => {
    expect(getEligibleTaskTypes({ role: 'contributor', trustLevel: 1 })).toEqual(['confirm', 'region_tag']);
  });

  it('adds translation and transliteration tasks at trust level 2', () => {
    const types = getEligibleTaskTypes({ role: 'contributor', trustLevel: 2 });
    expect(types).toEqual([
      'confirm',
      'region_tag',
      'translate_msa',
      'translate_fr',
      'translate_en',
      'transliterate_to_arabic',
      'transliterate_to_arabizi',
    ]);
  });

  it('gives reviewers the full reviewer task set regardless of trust level', () => {
    expect(getEligibleTaskTypes({ role: 'reviewer', trustLevel: 0 })).toEqual([
      'review',
      'standardise',
      'adjudicate',
      'link_lemma',
    ]);
  });

  it('gives admin and superadmin the reviewer task set too', () => {
    expect(getEligibleTaskTypes({ role: 'admin', trustLevel: 0 })).toEqual(getEligibleTaskTypes({ role: 'reviewer', trustLevel: 0 }));
    expect(getEligibleTaskTypes({ role: 'superadmin', trustLevel: 0 })).toEqual(getEligibleTaskTypes({ role: 'reviewer', trustLevel: 0 }));
  });
});

describe('getClaimableTaskRole', () => {
  it('maps reviewer, admin, and superadmin to the reviewer claim role', () => {
    expect(getClaimableTaskRole('reviewer')).toBe('reviewer');
    expect(getClaimableTaskRole('admin')).toBe('reviewer');
    expect(getClaimableTaskRole('superadmin')).toBe('reviewer');
  });

  it('maps contributor to the contributor claim role', () => {
    expect(getClaimableTaskRole('contributor')).toBe('contributor');
  });
});
