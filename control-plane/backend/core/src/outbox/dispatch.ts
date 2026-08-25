import type { OutboxEvent, PrismaClient } from '@open-derja/db';

const MAX_ATTEMPTS = 5;

export async function claimNextOutboxEvent(prisma: PrismaClient): Promise<OutboxEvent | undefined> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    UPDATE outbox_events
    SET status = 'processing'
    WHERE id = (
      SELECT id FROM outbox_events
      WHERE status = 'pending'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id
  `);

  const claimedId = rows[0]?.id;
  if (!claimedId) {
    return undefined;
  }
  return prisma.outboxEvent.findUniqueOrThrow({ where: { id: claimedId } });
}

export function markOutboxEventSent(prisma: PrismaClient, id: string): Promise<OutboxEvent> {
  return prisma.outboxEvent.update({
    where: { id },
    data: { status: 'sent', processedAt: new Date() },
  });
}

export async function markOutboxEventFailed(prisma: PrismaClient, id: string): Promise<OutboxEvent> {
  const event = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
  const attempts = event.attempts + 1;
  const permanent = attempts >= MAX_ATTEMPTS;
  return prisma.outboxEvent.update({
    where: { id },
    data: {
      attempts,
      status: permanent ? 'failed_permanent' : 'failed',
      processedAt: permanent ? new Date() : undefined,
    },
  });
}

export async function resetStuckOutboxEvents(prisma: PrismaClient): Promise<{ reset: number }> {
  const result = await prisma.outboxEvent.updateMany({
    where: { status: 'processing' },
    data: { status: 'pending' },
  });
  return { reset: result.count };
}

export function retryOutboxEvent(prisma: PrismaClient, id: string): Promise<OutboxEvent> {
  return prisma.outboxEvent.update({
    where: { id },
    data: { status: 'pending' },
  });
}
