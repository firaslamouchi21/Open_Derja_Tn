import type { PrismaClient } from '@open-derja/db';

export interface TrustInputs {
  approved: number;
  rejected: number;
  distinctTaskTypes: number;
  emailConfirmed: boolean;
}

export function computeTrustLevel(inputs: TrustInputs): number {
  const total = inputs.approved + inputs.rejected;
  const rejectRate = total > 0 ? inputs.rejected / total : 0;

  if (inputs.approved >= 10 && inputs.distinctTaskTypes >= 2 && rejectRate < 0.05) {
    return 3;
  }
  if (inputs.emailConfirmed && inputs.approved >= 10 && rejectRate < 0.1) {
    return 2;
  }
  if (inputs.approved >= 3) {
    return 1;
  }
  return 0;
}

export async function recomputeTrustLevels(prisma: PrismaClient): Promise<{ updated: number }> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['contributor', 'trusted_contributor'] } },
    select: { id: true, trustLevel: true, emailConfirmed: true },
  });

  let updated = 0;
  for (const user of users) {
    const [approved, rejected, distinctTypes] = await Promise.all([
      prisma.task.count({ where: { completedBy: user.id, status: 'done' } }),
      prisma.task.count({ where: { completedBy: user.id, status: 'rejected' } }),
      prisma.task.findMany({
        where: { completedBy: user.id, status: 'done' },
        distinct: ['type'],
        select: { type: true },
      }),
    ]);

    const nextLevel = computeTrustLevel({
      approved,
      rejected,
      distinctTaskTypes: distinctTypes.length,
      emailConfirmed: user.emailConfirmed,
    });

    if (nextLevel !== user.trustLevel) {
      await prisma.user.update({ where: { id: user.id }, data: { trustLevel: nextLevel } });
      await prisma.auditLog.create({
        data: {
          action: 'trust_level_recomputed',
          entityType: 'user',
          entityId: user.id,
          diff: { from: user.trustLevel, to: nextLevel },
        },
      });
      updated += 1;
    }
  }

  return { updated };
}
