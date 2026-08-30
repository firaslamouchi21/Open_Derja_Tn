import type PgBoss from 'pg-boss';
import { PrismaClient } from '@open-derja/db';
import {
  claimNextOutboxEvent,
  mailConfigFromEnv,
  markOutboxEventFailed,
  markOutboxEventSent,
  renderOutboxEmail,
  resetStuckOutboxEvents,
  sendEmail,
  type OutboxEmailPayload,
} from '@open-derja/core';

export const DISPATCH_OUTBOX_QUEUE = 'dispatch-outbox';
export const RESET_STUCK_OUTBOX_QUEUE = 'reset-stuck-outbox';
const DISPATCH_CRON = '* * * * *';
const RESET_CRON = '*/5 * * * *';
const BATCH_LIMIT = 25;

async function dispatchOne(prisma: PrismaClient): Promise<boolean> {
  const event = await claimNextOutboxEvent(prisma);
  if (!event) {
    return false;
  }
  try {
    if (event.eventType.startsWith('email.')) {
      const mail = renderOutboxEmail(event.eventType, event.payload as unknown as OutboxEmailPayload);
      await sendEmail(mail, mailConfigFromEnv());
      await markOutboxEventSent(prisma, event.id);
    } else {
      await markOutboxEventFailed(prisma, event.id);
      console.warn(`[dispatch-outbox] no handler for event type "${event.eventType}"`);
    }
  } catch (error) {
    await markOutboxEventFailed(prisma, event.id);
    console.error(`[dispatch-outbox] event ${event.id} failed:`, error instanceof Error ? error.message : error);
  }
  return true;
}

export async function registerDispatchOutboxJob(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  await boss.createQueue(DISPATCH_OUTBOX_QUEUE);
  await boss.createQueue(RESET_STUCK_OUTBOX_QUEUE);
  await boss.schedule(DISPATCH_OUTBOX_QUEUE, DISPATCH_CRON);
  await boss.schedule(RESET_STUCK_OUTBOX_QUEUE, RESET_CRON);

  await boss.work(DISPATCH_OUTBOX_QUEUE, async () => {
    let processed = 0;
    while (processed < BATCH_LIMIT && (await dispatchOne(prisma))) {
      processed += 1;
    }
    if (processed > 0) {
      console.log(`[dispatch-outbox] processed ${processed} event(s)`);
    }
  });

  await boss.work(RESET_STUCK_OUTBOX_QUEUE, async () => {
    const { reset } = await resetStuckOutboxEvents(prisma);
    if (reset > 0) {
      console.log(`[reset-stuck-outbox] reset ${reset} stuck event(s)`);
    }
  });
}
