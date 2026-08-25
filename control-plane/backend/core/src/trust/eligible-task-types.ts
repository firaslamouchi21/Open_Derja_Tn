import type { TaskRole, TaskType, UserRole } from '@open-derja/db';

const CONTRIBUTOR_BASE_TYPES: TaskType[] = ['confirm'];
const CONTRIBUTOR_TRUST_1_TYPES: TaskType[] = ['region_tag'];
const CONTRIBUTOR_TRUST_2_TYPES: TaskType[] = [
  'translate_msa',
  'translate_fr',
  'translate_en',
  'transliterate_to_arabic',
  'transliterate_to_arabizi',
];

const REVIEWER_TYPES: TaskType[] = ['review', 'standardise', 'adjudicate', 'link_lemma'];

export function getEligibleTaskTypes(user: { role: UserRole; trustLevel: number }): TaskType[] {
  if (user.role === 'reviewer' || user.role === 'admin' || user.role === 'superadmin') {
    return REVIEWER_TYPES;
  }

  const types = [...CONTRIBUTOR_BASE_TYPES];
  if (user.trustLevel >= 1) {
    types.push(...CONTRIBUTOR_TRUST_1_TYPES);
  }
  if (user.trustLevel >= 2) {
    types.push(...CONTRIBUTOR_TRUST_2_TYPES);
  }
  return types;
}

export function getClaimableTaskRole(userRole: UserRole): TaskRole {
  if (userRole === 'reviewer' || userRole === 'admin' || userRole === 'superadmin') {
    return 'reviewer';
  }
  return 'contributor';
}
