import type { OutboxEvent, Prisma, PrismaClient } from '@open-derja/db';

export function writeOutboxEvent(
  client: PrismaClient | Prisma.TransactionClient,
  eventType: string,
  payload: Prisma.InputJsonValue,
): Promise<OutboxEvent> {
  return client.outboxEvent.create({
    data: { eventType, payload },
  });
}
