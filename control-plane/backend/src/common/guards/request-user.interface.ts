import type { UserRole } from '@open-derja/db';

export interface RequestUser {
  id: string;
  role: UserRole;
  trustLevel: number;
  emailConfirmed: boolean;
  sessionId?: string;
  twofaPending?: boolean;
}
