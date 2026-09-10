import type { PrismaClient } from '@open-derja/db';
import type { StorageProvider } from './provider';

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SweepResult {
  confirmed: number;
  deleted: number;
}

export async function sweepPendingUploads(
  prisma: PrismaClient,
  provider: StorageProvider,
  options: { maxAgeMs?: number } = {},
): Promise<SweepResult> {
  const cutoff = new Date(Date.now() - (options.maxAgeMs ?? DEFAULT_MAX_AGE_MS));
  const stale = await prisma.storedObject.findMany({
    where: { status: 'pending', createdAt: { lt: cutoff } },
  });

  let confirmed = 0;
  let deleted = 0;

  for (const object of stale) {
    const head = await provider.headObject(object.storageKey);
    if (head.exists) {
      await prisma.storedObject.update({
        where: { id: object.id },
        data: {
          status: 'stored',
          confirmedAt: new Date(),
          sizeBytes: head.size !== undefined ? BigInt(head.size) : object.sizeBytes,
          checksum: head.checksum ?? object.checksum,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: 'stored_object_swept_confirmed',
          entityType: 'stored_object',
          entityId: object.id,
          diff: { storageKey: object.storageKey },
        },
      });
      confirmed += 1;
    } else {
      await prisma.storedObject.update({
        where: { id: object.id },
        data: { status: 'deleted', deletedAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          action: 'stored_object_swept_abandoned',
          entityType: 'stored_object',
          entityId: object.id,
          diff: { storageKey: object.storageKey },
        },
      });
      deleted += 1;
    }
  }

  return { confirmed, deleted };
}
