import type { PrismaClient, Task, TaskRole, TaskType } from '@open-derja/db';

const CLAIM_EXPIRY_HOURS = 2;
const MAX_CONCURRENT_CLAIMS_PER_WORKER = 5;

export interface ClaimNextTaskParams {
  userId: string;
  role: TaskRole;
  types?: TaskType[];
}

export async function claimNextTask(prisma: PrismaClient, params: ClaimNextTaskParams): Promise<Task | undefined> {
  const activeClaims = await prisma.task.count({
    where: { claimedBy: params.userId, status: 'claimed' },
  });
  if (activeClaims >= MAX_CONCURRENT_CLAIMS_PER_WORKER) {
    return undefined;
  }

  const typeFilter = params.types && params.types.length > 0 ? params.types : undefined;

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
    UPDATE tasks
    SET status = 'claimed', claimed_by = $1::uuid, claimed_at = now(), updated_at = now()
    WHERE id = (
      SELECT id FROM tasks
      WHERE status IN ('open', 'needs_rework')
        AND requires_role = $2::"TaskRole"
        ${typeFilter ? 'AND type = ANY($3::"TaskType"[])' : ''}
      ORDER BY priority DESC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id
    `,
    params.userId,
    params.role,
    ...(typeFilter ? [typeFilter] : []),
  );

  const claimedId = rows[0]?.id;
  if (!claimedId) {
    return undefined;
  }
  return prisma.task.findUniqueOrThrow({ where: { id: claimedId } });
}

export async function releaseExpiredClaims(prisma: PrismaClient): Promise<{ released: number }> {
  const cutoff = new Date(Date.now() - CLAIM_EXPIRY_HOURS * 60 * 60 * 1000);
  const result = await prisma.task.updateMany({
    where: { status: 'claimed', claimedAt: { lt: cutoff } },
    data: { status: 'open', claimedBy: null, claimedAt: null },
  });
  return { released: result.count };
}
