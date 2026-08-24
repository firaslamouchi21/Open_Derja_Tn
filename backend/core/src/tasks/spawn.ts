import type { Prisma, PrismaClient, Region, TaskRole, TaskType } from '@open-derja/db';
import { computeIdemKey } from './idem-key';

export interface TaskSpec {
  corpusItemId: string;
  type: TaskType;
  itemVersion: number;
  slot: string;
  requiresRole: TaskRole;
  priority?: number;
  targetRegions?: Region[];
}

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export async function spawnTask(
  client: PrismaClient | Prisma.TransactionClient,
  spec: TaskSpec,
): Promise<{ spawned: boolean }> {
  const idemKey = computeIdemKey(spec.corpusItemId, spec.type, spec.itemVersion, spec.slot);

  try {
    await client.task.create({
      data: {
        corpusItemId: spec.corpusItemId,
        type: spec.type,
        itemVersion: spec.itemVersion,
        idempotencySlot: spec.slot,
        idemKey,
        requiresRole: spec.requiresRole,
        priority: spec.priority ?? 0,
        targetRegions: spec.targetRegions ?? [],
      },
    });
    return { spawned: true };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { spawned: false };
    }
    throw error;
  }
}

export async function spawnTasks(
  client: PrismaClient | Prisma.TransactionClient,
  specs: TaskSpec[],
): Promise<{ spawned: number; skipped: number }> {
  let spawned = 0;
  let skipped = 0;
  for (const spec of specs) {
    const result = await spawnTask(client, spec);
    if (result.spawned) {
      spawned += 1;
    } else {
      skipped += 1;
    }
  }
  return { spawned, skipped };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === UNIQUE_CONSTRAINT_VIOLATION;
}
