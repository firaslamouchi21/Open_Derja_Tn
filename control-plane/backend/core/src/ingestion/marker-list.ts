import type { PrismaClient } from '@open-derja/db';

export async function loadActiveMarkerTerms(prisma: PrismaClient, listVersion?: number): Promise<string[]> {
  const version = listVersion ?? (await prisma.markerTerm.aggregate({ _max: { listVersion: true } }))._max.listVersion;
  if (version == null) return [];

  const rows = await prisma.markerTerm.findMany({
    where: { listVersion: version, active: true },
    select: { term: true },
  });
  return rows.map((row) => row.term);
}
