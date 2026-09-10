import { SystemSettingsService } from '../../../../../../../control-plane/backend/src/infra/system/system-settings.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    systemSetting: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) },
    ...overrides,
  } as any;
}

describe('SystemSettingsService.get', () => {
  it('returns the fallback when no row exists', async () => {
    const prisma = makePrisma();
    const service = new SystemSettingsService(prisma);

    await expect(service.get('some_key', { default: true })).resolves.toEqual({ default: true });
  });

  it('returns the stored value when a row exists', async () => {
    const prisma = makePrisma({ systemSetting: { findUnique: jest.fn().mockResolvedValue({ value: { enabled: true } }) } });
    const service = new SystemSettingsService(prisma);

    await expect(service.get('some_key', { enabled: false })).resolves.toEqual({ enabled: true });
  });
});

describe('SystemSettingsService.set', () => {
  it('upserts the key with the same value on create and update', async () => {
    const prisma = makePrisma();
    const service = new SystemSettingsService(prisma);

    await service.set('some_key', { on: true }, 'actor-1');

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'some_key' },
      create: { key: 'some_key', value: { on: true }, updatedBy: 'actor-1' },
      update: { value: { on: true }, updatedBy: 'actor-1' },
    });
  });
});

describe('SystemSettingsService.getMaintenanceMode', () => {
  it('defaults to disabled with no message', async () => {
    const prisma = makePrisma();
    const service = new SystemSettingsService(prisma);

    await expect(service.getMaintenanceMode()).resolves.toEqual({ enabled: false, message: '' });
  });
});

describe('SystemSettingsService.getPausedTaskTypes', () => {
  it('defaults to an empty list', async () => {
    const prisma = makePrisma();
    const service = new SystemSettingsService(prisma);

    await expect(service.getPausedTaskTypes()).resolves.toEqual([]);
  });

  it('returns the stored list of paused types', async () => {
    const prisma = makePrisma({ systemSetting: { findUnique: jest.fn().mockResolvedValue({ value: ['review'] }) } });
    const service = new SystemSettingsService(prisma);

    await expect(service.getPausedTaskTypes()).resolves.toEqual(['review']);
  });
});
