import * as core from '@open-derja/core';
import { SystemService } from '../../../../../../../../control-plane/backend/src/modules/admin/system/system.service';

jest.mock('@open-derja/core', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }), { virtual: true });
const mockedCore = core as jest.Mocked<typeof core>;

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    databaseBackup: { findMany: jest.fn().mockResolvedValue([]) },
    featureFlag: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

function makeSystemSettings() {
  return { set: jest.fn().mockResolvedValue(undefined) } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('SystemService.jobs', () => {
  it('returns pg-boss job counts when the query succeeds', async () => {
    const prisma = makePrisma({ $queryRawUnsafe: jest.fn().mockResolvedValue([{ name: 'x', state: 'created', count: 2 }]) });
    const service = new SystemService(prisma, makeSystemSettings());

    await expect(service.jobs()).resolves.toEqual({ jobs: [{ name: 'x', state: 'created', count: 2 }] });
  });

  it('degrades to an empty list rather than throwing when pgboss schema is unavailable', async () => {
    const prisma = makePrisma({ $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('schema pgboss does not exist')) });
    const service = new SystemService(prisma, makeSystemSettings());

    await expect(service.jobs()).resolves.toEqual({ jobs: [] });
  });
});

describe('SystemService.upsertFeatureFlag', () => {
  it('upserts by key and writes an audit log entry', async () => {
    const prisma = makePrisma({ featureFlag: { findMany: jest.fn(), upsert: jest.fn().mockResolvedValue({ key: 'x' }) } });
    const service = new SystemService(prisma, makeSystemSettings());

    await service.upsertFeatureFlag({ key: 'x', enabled: true, audience: 'public' } as any, 'actor-1');

    expect(prisma.featureFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'x' }, create: expect.objectContaining({ enabled: true }) }),
    );
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });
});

describe('SystemService.setMaintenance', () => {
  it('stores the maintenance value and logs the change', async () => {
    const systemSettings = makeSystemSettings();
    const service = new SystemService(makePrisma(), systemSettings);

    const result = await service.setMaintenance({ enabled: true, message: 'upgrading' } as any, 'actor-1');

    expect(result).toEqual({ enabled: true, message: 'upgrading' });
    expect(systemSettings.set).toHaveBeenCalledWith('maintenance_mode', { enabled: true, message: 'upgrading' }, 'actor-1');
    expect(mockedCore.writeAuditLog).toHaveBeenCalled();
  });

  it('defaults the message to an empty string when none is given', async () => {
    const systemSettings = makeSystemSettings();
    const service = new SystemService(makePrisma(), systemSettings);

    const result = await service.setMaintenance({ enabled: false } as any, 'actor-1');

    expect(result).toEqual({ enabled: false, message: '' });
  });
});

describe('SystemService.auditLog', () => {
  it('only applies filters that were actually given', async () => {
    const prisma = makePrisma();
    const service = new SystemService(prisma, makeSystemSettings());

    await service.auditLog({ actorId: 'a1', skip: 0, take: 50 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { actorId: 'a1' } }),
    );
  });

  it('caps take at 200 regardless of what is requested', async () => {
    const prisma = makePrisma();
    const service = new SystemService(prisma, makeSystemSettings());

    await service.auditLog({ skip: 0, take: 10000 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });
});
