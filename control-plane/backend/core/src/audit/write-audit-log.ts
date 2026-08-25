import type { AuditLog, Prisma, PrismaClient } from '@open-derja/db';

export interface WriteAuditLogParams {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: Prisma.InputJsonValue;
  ipHash?: string;
}

export function writeAuditLog(
  client: PrismaClient | Prisma.TransactionClient,
  params: WriteAuditLogParams,
): Promise<AuditLog> {
  return client.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      diff: params.diff,
      ipHash: params.ipHash,
    },
  });
}
