import { claimNextTask, releaseExpiredClaims } from '../../../../../../control-plane/backend/core/src/tasks/claim';

function makePrisma() {
  return {
    task: { count: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
    $queryRawUnsafe: jest.fn(),
  } as any;
}

describe('claimNextTask', () => {
  it('refuses to claim once the worker already holds the maximum concurrent claims', async () => {
    const prisma = makePrisma();
    prisma.task.count.mockResolvedValue(5);

    const result = await claimNextTask(prisma, { userId: 'u1', role: 'reviewer' });

    expect(result).toBeUndefined();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('returns undefined when no task is available to claim', async () => {
    const prisma = makePrisma();
    prisma.task.count.mockResolvedValue(0);
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const result = await claimNextTask(prisma, { userId: 'u1', role: 'reviewer' });

    expect(result).toBeUndefined();
    expect(prisma.task.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('claims the returned task id and fetches its full record', async () => {
    const prisma = makePrisma();
    prisma.task.count.mockResolvedValue(0);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'task-1' }]);
    prisma.task.findUniqueOrThrow.mockResolvedValue({ id: 'task-1', status: 'claimed' });

    const result = await claimNextTask(prisma, { userId: 'u1', role: 'reviewer' });

    expect(prisma.task.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    expect(result).toEqual({ id: 'task-1', status: 'claimed' });
  });

  it('passes the type filter through as an extra query parameter only when types are given', async () => {
    const prisma = makePrisma();
    prisma.task.count.mockResolvedValue(0);
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    await claimNextTask(prisma, { userId: 'u1', role: 'contributor', types: ['confirm', 'region_tag'] });
    const callWithTypes = prisma.$queryRawUnsafe.mock.calls[0];
    expect(callWithTypes).toEqual([expect.any(String), 'u1', 'contributor', ['confirm', 'region_tag']]);

    prisma.$queryRawUnsafe.mockClear();
    await claimNextTask(prisma, { userId: 'u1', role: 'contributor', types: [] });
    const callWithoutTypes = prisma.$queryRawUnsafe.mock.calls[0];
    expect(callWithoutTypes).toEqual([expect.any(String), 'u1', 'contributor']);
  });
});

describe('releaseExpiredClaims', () => {
  it('releases claims older than the expiry cutoff back to open', async () => {
    const prisma = makePrisma();
    prisma.task.updateMany.mockResolvedValue({ count: 3 });

    const result = await releaseExpiredClaims(prisma);

    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { status: 'claimed', claimedAt: { lt: expect.any(Date) } },
      data: { status: 'open', claimedBy: null, claimedAt: null },
    });
    expect(result).toEqual({ released: 3 });
  });
});
