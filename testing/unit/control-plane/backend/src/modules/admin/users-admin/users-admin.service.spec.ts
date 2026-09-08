import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { UsersAdminService } from '../../../../../../../../control-plane/backend/src/modules/admin/users-admin/users-admin.service';

jest.mock(
  '@open-derja/core',
  () => ({
    writeAuditLog: jest.fn().mockResolvedValue(undefined),
    queueReviewerInviteEmail: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true },
);
const mockedCore = core as jest.Mocked<typeof core>;

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    reviewerInvite: { create: jest.fn().mockResolvedValue({}) },
    user: { update: jest.fn().mockResolvedValue({ id: 'u1', role: 'reviewer' }) },
    refreshSession: { updateMany: jest.fn().mockResolvedValue({}) },
    task: { updateMany: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  const tx = overrides.tx ?? makeTx();
  return {
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    task: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    tag: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('UsersAdminService.quality', () => {
  it('throws when the user does not exist', async () => {
    const service = new UsersAdminService(makePrisma());

    await expect(service.quality('ghost')).rejects.toThrow(NotFoundException);
  });

  it('computes an approval rate and region breakdown', async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'contributor' }) },
      task: { count: jest.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(2), findMany: jest.fn() },
      tag: { groupBy: jest.fn().mockResolvedValue([{ value: 'north', _count: { _all: 5 } }]) },
    });
    const service = new UsersAdminService(prisma);

    const result = await service.quality('u1');

    expect(result).toEqual({ approved: 8, rejected: 2, approvalRate: 0.8, regions: [{ region: 'north', count: 5 }] });
  });

  it('reports a null approval rate rather than dividing by zero when there is no history', async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'contributor' }) },
      task: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() },
    });
    const service = new UsersAdminService(prisma);

    const result = await service.quality('u1');

    expect(result.approvalRate).toBeNull();
  });
});

describe('UsersAdminService.inviteReviewer', () => {
  it('creates the invite, queues the email, and logs the action', async () => {
    const tx = makeTx();
    const prisma = makePrisma({ tx });
    const service = new UsersAdminService(prisma);

    const result = await service.inviteReviewer({ email: 'r@x.com', region: 'sahel' } as any, 'actor-1');

    expect(result.email).toBe('r@x.com');
    expect(tx.reviewerInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'r@x.com', region: 'sahel' }) }),
    );
    expect(mockedCore.queueReviewerInviteEmail).toHaveBeenCalled();
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });

  it('never stores the raw invite token, only its hash', async () => {
    const tx = makeTx();
    const prisma = makePrisma({ tx });
    const service = new UsersAdminService(prisma);

    await service.inviteReviewer({ email: 'r@x.com', region: 'sahel' } as any, 'actor-1');

    const createCall = tx.reviewerInvite.create.mock.calls[0][0].data;
    const emailedToken = mockedCore.queueReviewerInviteEmail.mock.calls[0][1].token;
    expect(createCall.tokenHash).not.toBe(emailedToken);
    expect(createCall.tokenHash).toHaveLength(64);
  });
});

describe('UsersAdminService.banWithRevert', () => {
  it('throws when the target user does not exist', async () => {
    const service = new UsersAdminService(makePrisma());

    await expect(service.banWithRevert('ghost', { confirmCount: 0 } as any, 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('refuses to ban an admin or superadmin directly', async () => {
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ role: 'admin' }) } });
    const service = new UsersAdminService(prisma);

    await expect(service.banWithRevert('u1', { confirmCount: 0 } as any, 'actor-1')).rejects.toThrow(ForbiddenException);
  });

  it('deactivates the user, revokes sessions, and reverts their done tasks — clearing any stale claim, not just completion', async () => {
    const tx = makeTx();
    const prisma = makePrisma({
      tx,
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'contributor' }) },
      task: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]) },
    });
    const service = new UsersAdminService(prisma);

    const result = await service.banWithRevert('u1', { reason: 'spam', confirmCount: 2 } as any, 'actor-1');

    expect(result).toEqual({ reverted: 2 });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { active: false, tokenVersion: { increment: 1 } },
    });
    expect(tx.task.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2'] } },
      data: { status: 'needs_rework', completedBy: null, completedAt: null, claimedBy: null, claimedAt: null },
    });
  });

  it('refuses when the confirm count does not match the real revert count', async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'contributor' }) },
      task: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: 't1' }]) },
    });
    const service = new UsersAdminService(prisma);

    await expect(service.banWithRevert('u1', { confirmCount: 99 } as any, 'actor-1')).rejects.toThrow();
  });
});

describe('UsersAdminService.setRole', () => {
  it('throws when the target user does not exist', async () => {
    const service = new UsersAdminService(makePrisma());

    await expect(service.setRole('ghost', { role: 'reviewer' } as any, 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('refuses to let an actor change their own role', async () => {
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ role: 'admin' }) } });
    const service = new UsersAdminService(prisma);

    await expect(service.setRole('actor-1', { role: 'superadmin' } as any, 'actor-1')).rejects.toThrow(BadRequestException);
  });

  it('updates the role, bumps token version, and revokes sessions', async () => {
    const tx = makeTx();
    const prisma = makePrisma({ tx, user: { findUnique: jest.fn().mockResolvedValue({ role: 'contributor' }) } });
    const service = new UsersAdminService(prisma);

    const result = await service.setRole('u1', { role: 'reviewer', reason: 'promoted' } as any, 'actor-1');

    expect(result).toEqual({ id: 'u1', role: 'reviewer' });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { role: 'reviewer', tokenVersion: { increment: 1 } },
    });
    expect(tx.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', revokedAt: null }) }),
    );
  });
});
