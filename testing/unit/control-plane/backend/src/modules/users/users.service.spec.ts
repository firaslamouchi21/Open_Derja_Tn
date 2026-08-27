import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../../../../../control-plane/backend/src/modules/users/users.service';

function makePrisma() {
  const prisma: any = {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  return prisma;
}

const SAFE_USER = { id: 'u1', role: 'contributor', trustLevel: 0 };

describe('UsersService.findOne', () => {
  it('throws NotFoundException when the user does not exist', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new UsersService(prisma);

    await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
  });

  it('returns the user when found', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(SAFE_USER);
    const service = new UsersService(prisma);

    await expect(service.findOne('u1')).resolves.toEqual(SAFE_USER);
  });
});

describe('UsersService.promoteToReviewer', () => {
  it('throws NotFoundException before touching the database when the user does not exist', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new UsersService(prisma);

    await expect(service.promoteToReviewer('ghost', { regionSelfReported: 'sahel' } as any, 'actor-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('promotes the user to reviewer and writes a matching audit log entry in the same transaction', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(SAFE_USER);
    prisma.user.update.mockResolvedValue({ ...SAFE_USER, role: 'reviewer' });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    const service = new UsersService(prisma);

    const result = await service.promoteToReviewer('u1', { regionSelfReported: 'sahel' } as any, 'actor-1');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: { role: 'reviewer', regionSelfReported: 'sahel' } }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'actor-1',
          action: 'promote_to_reviewer',
          entityType: 'user',
          entityId: 'u1',
          diff: { role: 'reviewer', regionSelfReported: 'sahel' },
        }),
      }),
    );
    expect(result).toEqual({ ...SAFE_USER, role: 'reviewer' });
  });
});

describe('UsersService.adjustTrust', () => {
  it('records the before/after trust level and reason in the audit diff', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ ...SAFE_USER, trustLevel: 1 });
    prisma.user.update.mockResolvedValue({ ...SAFE_USER, trustLevel: 2 });
    const service = new UsersService(prisma);

    await service.adjustTrust('u1', { trustLevel: 2, reason: 'good work' } as any, 'actor-1');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'adjust_trust',
          diff: { from: 1, to: 2, reason: 'good work' },
        }),
      }),
    );
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new UsersService(prisma);

    await expect(service.adjustTrust('ghost', { trustLevel: 2 } as any, 'actor-1')).rejects.toThrow(NotFoundException);
  });
});

describe('UsersService.ban', () => {
  it('deactivates the user and logs the reason', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(SAFE_USER);
    prisma.user.update.mockResolvedValue({ ...SAFE_USER, active: false });
    const service = new UsersService(prisma);

    await service.ban('u1', { reason: 'spam' } as any, 'actor-1');

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { active: false } }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'ban', diff: { active: false, reason: 'spam' } }) }),
    );
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new UsersService(prisma);

    await expect(service.ban('ghost', { reason: 'spam' } as any, 'actor-1')).rejects.toThrow(NotFoundException);
  });
});

describe('UsersService.findAll', () => {
  it('filters by role when given', async () => {
    const prisma = makePrisma();
    prisma.user.findMany.mockResolvedValue([]);
    const service = new UsersService(prisma);

    await service.findAll('reviewer' as any);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'reviewer' } }));

    await service.findAll();
    expect(prisma.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: undefined }));
  });
});
