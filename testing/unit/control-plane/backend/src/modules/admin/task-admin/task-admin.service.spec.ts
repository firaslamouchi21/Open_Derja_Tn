import { NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { TaskAdminService } from '../../../../../../../../control-plane/backend/src/modules/admin/task-admin/task-admin.service';

jest.mock('@open-derja/core', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }), { virtual: true });
const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    task: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ...overrides,
  } as any;
}

function makeSystemSettings(overrides: Record<string, unknown> = {}) {
  return {
    getPausedTaskTypes: jest.fn().mockResolvedValue([]),
    set: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('TaskAdminService.reprioritise', () => {
  it('updates matching open/needs_rework tasks and logs the change', async () => {
    const prisma = makePrisma({ task: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) } });
    const service = new TaskAdminService(prisma, makeSystemSettings());

    const result = await service.reprioritise({ type: 'review', priority: 5 } as any, 'actor-1');

    expect(result).toEqual({ updated: 3 });
    expect(prisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'review', status: { in: ['open', 'needs_rework'] } }),
        data: { priority: 5 },
      }),
    );
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });

  it('adds a targetRegions filter only when regions are given', async () => {
    const prisma = makePrisma();
    const service = new TaskAdminService(prisma, makeSystemSettings());

    await service.reprioritise({ type: 'region_tag', priority: 1, targetRegions: ['north'] } as any, 'actor-1');

    const where = prisma.task.updateMany.mock.calls[0][0].where;
    expect(where.targetRegions).toEqual({ hasSome: ['north'] });
  });
});

describe('TaskAdminService.forceRelease', () => {
  it('throws when the task does not exist', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(null);
    const service = new TaskAdminService(prisma, makeSystemSettings());

    await expect(service.forceRelease('ghost', 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('reopens the task and clears the claim', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue({ id: 't1', claimedBy: 'user-1' });
    prisma.task.update.mockResolvedValue({ id: 't1', status: 'open' });
    const service = new TaskAdminService(prisma, makeSystemSettings());

    await service.forceRelease('t1', 'actor-1');

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'open', claimedBy: null, claimedAt: null },
    });
  });
});

describe('TaskAdminService.reassign', () => {
  it('throws when the task does not exist', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(null);
    const service = new TaskAdminService(prisma, makeSystemSettings());

    await expect(service.reassign('ghost', 'user-2', 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('reassigns the task to the new claimant', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue({ id: 't1', claimedBy: 'user-1' });
    prisma.task.update.mockResolvedValue({ id: 't1', claimedBy: 'user-2' });
    const service = new TaskAdminService(prisma, makeSystemSettings());

    await service.reassign('t1', 'user-2', 'actor-1');

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'claimed', claimedBy: 'user-2', claimedAt: expect.any(Date) },
    });
  });
});

describe('TaskAdminService.pause / resume', () => {
  it('adds a task type to the paused list without duplicating it', async () => {
    const systemSettings = makeSystemSettings({ getPausedTaskTypes: jest.fn().mockResolvedValue(['confirm']) });
    const service = new TaskAdminService(makePrisma(), systemSettings);

    const result = await service.pause('confirm', 'actor-1');

    expect(result).toEqual({ paused: ['confirm'] });
    expect(systemSettings.set).toHaveBeenCalledWith('paused_task_types', ['confirm'], 'actor-1');
  });

  it('appends a newly paused task type', async () => {
    const systemSettings = makeSystemSettings({ getPausedTaskTypes: jest.fn().mockResolvedValue(['confirm']) });
    const service = new TaskAdminService(makePrisma(), systemSettings);

    const result = await service.pause('review', 'actor-1');

    expect(result).toEqual({ paused: ['confirm', 'review'] });
  });

  it('removes a task type on resume', async () => {
    const systemSettings = makeSystemSettings({ getPausedTaskTypes: jest.fn().mockResolvedValue(['confirm', 'review']) });
    const service = new TaskAdminService(makePrisma(), systemSettings);

    const result = await service.resume('confirm', 'actor-1');

    expect(result).toEqual({ paused: ['review'] });
  });
});
