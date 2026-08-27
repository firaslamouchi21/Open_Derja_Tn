import { NotFoundException } from '@nestjs/common';
import { SourcesService } from '../../../../../../../control-plane/backend/src/modules/sources/sources.service';

function makePrisma() {
  return { source: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } } as any;
}

describe('SourcesService.findOne', () => {
  it('throws NotFoundException when the source does not exist', async () => {
    const prisma = makePrisma();
    prisma.source.findUnique.mockResolvedValue(null);
    const service = new SourcesService(prisma);

    await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
  });

  it('returns the source when found', async () => {
    const prisma = makePrisma();
    prisma.source.findUnique.mockResolvedValue({ id: 's1' });
    const service = new SourcesService(prisma);

    await expect(service.findOne('s1')).resolves.toEqual({ id: 's1' });
  });
});

describe('SourcesService.create', () => {
  it('defaults active to true when not specified', async () => {
    const prisma = makePrisma();
    prisma.source.create.mockResolvedValue({ id: 's1' });
    const service = new SourcesService(prisma);

    await service.create({ kind: 'forum', name: 'Test Forum', licenseDefault: 'unknown' } as any);

    expect(prisma.source.create).toHaveBeenCalledWith({ data: expect.objectContaining({ active: true }) });
  });

  it('respects an explicit active: false', async () => {
    const prisma = makePrisma();
    prisma.source.create.mockResolvedValue({ id: 's1' });
    const service = new SourcesService(prisma);

    await service.create({ kind: 'forum', name: 'Test Forum', licenseDefault: 'unknown', active: false } as any);

    expect(prisma.source.create).toHaveBeenCalledWith({ data: expect.objectContaining({ active: false }) });
  });
});

describe('SourcesService.update', () => {
  it('throws NotFoundException before updating when the source does not exist', async () => {
    const prisma = makePrisma();
    prisma.source.findUnique.mockResolvedValue(null);
    const service = new SourcesService(prisma);

    await expect(service.update('ghost', { name: 'x' } as any)).rejects.toThrow(NotFoundException);
    expect(prisma.source.update).not.toHaveBeenCalled();
  });

  it('updates an existing source with the given fields', async () => {
    const prisma = makePrisma();
    prisma.source.findUnique.mockResolvedValue({ id: 's1' });
    prisma.source.update.mockResolvedValue({ id: 's1', name: 'Renamed' });
    const service = new SourcesService(prisma);

    const result = await service.update('s1', { name: 'Renamed' } as any);

    expect(prisma.source.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { name: 'Renamed' } });
    expect(result).toEqual({ id: 's1', name: 'Renamed' });
  });
});

describe('SourcesService.disable', () => {
  it('throws NotFoundException when the source does not exist', async () => {
    const prisma = makePrisma();
    prisma.source.findUnique.mockResolvedValue(null);
    const service = new SourcesService(prisma);

    await expect(service.disable('ghost')).rejects.toThrow(NotFoundException);
  });

  it('sets active to false on an existing source', async () => {
    const prisma = makePrisma();
    prisma.source.findUnique.mockResolvedValue({ id: 's1' });
    prisma.source.update.mockResolvedValue({ id: 's1', active: false });
    const service = new SourcesService(prisma);

    await service.disable('s1');

    expect(prisma.source.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { active: false } });
  });
});
