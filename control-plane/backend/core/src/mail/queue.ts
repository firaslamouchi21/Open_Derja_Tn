import type { Prisma, PrismaClient } from '@open-derja/db';
import { writeOutboxEvent } from '../outbox/write';

export function queueVerificationEmail(
  client: PrismaClient | Prisma.TransactionClient,
  params: { email: string; code: string },
) {
  return writeOutboxEvent(client, 'email.verification', params);
}

export function queuePasswordResetEmail(
  client: PrismaClient | Prisma.TransactionClient,
  params: { email: string; code: string },
) {
  return writeOutboxEvent(client, 'email.password_reset', params);
}

export function queueReviewerInviteEmail(
  client: PrismaClient | Prisma.TransactionClient,
  params: { email: string; token: string; invitedBy: string },
) {
  return writeOutboxEvent(client, 'email.reviewer_invite', params);
}
