import {
  claimNextOutboxEvent,
  markOutboxEventFailed,
  markOutboxEventSent,
  resetStuckOutboxEvents,
  retryOutboxEvent,
} from '../../../../../../control-plane/backend/core/src/outbox/dispatch';

function makePrisma() {
  return {
    outboxEvent: { findUniqueOrThrow: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    $queryRawUnsafe: jest.fn(),
  } as any;
}

describe('claimNextOutboxEvent', () => {
  it('returns undefined when there is nothing pending', async () => {
    const prisma = makePrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    await expect(claimNextOutboxEvent(prisma)).resolves.toBeUndefined();
    expect(prisma.outboxEvent.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('claims the returned event id and fetches its full record', async () => {
    const prisma = makePrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'event-1' }]);
    prisma.outboxEvent.findUniqueOrThrow.mockResolvedValue({ id: 'event-1', status: 'processing' });

    const result = await claimNextOutboxEvent(prisma);

    expect(prisma.outboxEvent.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'event-1' } });
    expect(result).toEqual({ id: 'event-1', status: 'processing' });
  });
});

describe('markOutboxEventSent', () => {
  it('marks the event sent and stamps processedAt', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.update.mockResolvedValue({ id: 'event-1', status: 'sent' });

    await markOutboxEventSent(prisma, 'event-1');

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { status: 'sent', processedAt: expect.any(Date) },
    });
  });
});

describe('markOutboxEventFailed', () => {
  it('marks a transient failure without a permanent status below the attempt threshold', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.findUniqueOrThrow.mockResolvedValue({ id: 'event-1', attempts: 2 });
    prisma.outboxEvent.update.mockResolvedValue({ id: 'event-1', status: 'failed' });

    await markOutboxEventFailed(prisma, 'event-1');

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { attempts: 3, status: 'failed', processedAt: undefined },
    });
  });

  it('marks the failure permanent once attempts reach the maximum', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.findUniqueOrThrow.mockResolvedValue({ id: 'event-1', attempts: 4 });
    prisma.outboxEvent.update.mockResolvedValue({ id: 'event-1', status: 'failed_permanent' });

    await markOutboxEventFailed(prisma, 'event-1');

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { attempts: 5, status: 'failed_permanent', processedAt: expect.any(Date) },
    });
  });
});

describe('resetStuckOutboxEvents', () => {
  it('resets everything stuck in processing back to pending', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 2 });

    await expect(resetStuckOutboxEvents(prisma)).resolves.toEqual({ reset: 2 });
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { status: 'processing' },
      data: { status: 'pending' },
    });
  });
});

describe('retryOutboxEvent', () => {
  it('resets a single event back to pending', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.update.mockResolvedValue({ id: 'event-1', status: 'pending' });

    await retryOutboxEvent(prisma, 'event-1');

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({ where: { id: 'event-1' }, data: { status: 'pending' } });
  });
});
