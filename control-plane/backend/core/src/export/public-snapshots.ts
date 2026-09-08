import type { PrismaClient } from '@open-derja/db';

export interface PublicSnapshotListing {
  id: string;
  version: string;
  corpusItemCount: number;
  ruleVersion: number;
  notes: string | null;
  createdAt: Date;
  format: 'jsonl';
  checksum: string | null;
  sizeBytes: string | null;
}

export async function listPublicSnapshots(prisma: PrismaClient): Promise<PublicSnapshotListing[]> {
  const snapshots = await prisma.datasetSnapshot.findMany({
    where: { storedObject: { status: 'stored' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      version: true,
      corpusItemCount: true,
      ruleVersion: true,
      notes: true,
      createdAt: true,
      storedObject: { select: { checksum: true, sizeBytes: true } },
    },
  });

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    version: snapshot.version,
    corpusItemCount: snapshot.corpusItemCount,
    ruleVersion: snapshot.ruleVersion,
    notes: snapshot.notes,
    createdAt: snapshot.createdAt,
    format: 'jsonl',
    checksum: snapshot.storedObject.checksum,
    sizeBytes: snapshot.storedObject.sizeBytes === null ? null : snapshot.storedObject.sizeBytes.toString(),
  }));
}
