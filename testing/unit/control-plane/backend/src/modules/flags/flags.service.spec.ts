import { NotFoundException } from '@nestjs/common';
import { FlagsService } from '../../../../../../../control-plane/backend/src/modules/flags/flags.service';

function makePrisma() {
  return { flag: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } as any;
}

describe('FlagsService.create', () => {
  it('creates a flag carrying the anonymous session/ip context', async () => {
    const prisma = makePrisma();
    prisma.flag.create.mockResolvedValue({ id: 'flag-1' });
    const service = new FlagsService(prisma);

    await service.create({ targetType: 'corpus_item', targetId: 'item-1', reason: 'offensive' } as any, {
      sessionId: 'session-1',
      ipHash: 'hash-1',
    });

    expect(prisma.flag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ targetType: 'corpus_item', targetId: 'item-1', sessionId: 'session-1', ipHash: 'hash-1' }),
    });
  });
});

describe('FlagsService.findAll', () => {
  it('filters by status when given, and lists everything when not', async () => {
    const prisma = makePrisma();
    prisma.flag.findMany.mockResolvedValue([]);
    const service = new FlagsService(prisma);

    await service.findAll('open' as any);
    expect(prisma.flag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'open' } }));

    await service.findAll();
    expect(prisma.flag.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: undefined }));
  });
});

describe('FlagsService.resolve / dismiss', () => {
  it('throws NotFoundException when resolving a flag that does not exist', async () => {
    const prisma = makePrisma();
    prisma.flag.findUnique.mockResolvedValue(null);
    const service = new FlagsService(prisma);

    await expect(service.resolve('ghost', 'reviewer-1')).rejects.toThrow(NotFoundException);
  });

  it('marks an existing flag resolved with the resolver attributed', async () => {
    const prisma = makePrisma();
    prisma.flag.findUnique.mockResolvedValue({ id: 'flag-1' });
    prisma.flag.update.mockResolvedValue({ id: 'flag-1', status: 'resolved' });
    const service = new FlagsService(prisma);

    await service.resolve('flag-1', 'reviewer-1');

    expect(prisma.flag.update).toHaveBeenCalledWith({ where: { id: 'flag-1' }, data: { status: 'resolved', resolvedBy: 'reviewer-1' } });
  });

  it('throws NotFoundException when dismissing a flag that does not exist', async () => {
    const prisma = makePrisma();
    prisma.flag.findUnique.mockResolvedValue(null);
    const service = new FlagsService(prisma);

    await expect(service.dismiss('ghost', 'reviewer-1')).rejects.toThrow(NotFoundException);
  });

  it('marks an existing flag dismissed with the resolver attributed', async () => {
    const prisma = makePrisma();
    prisma.flag.findUnique.mockResolvedValue({ id: 'flag-1' });
    prisma.flag.update.mockResolvedValue({ id: 'flag-1', status: 'dismissed' });
    const service = new FlagsService(prisma);

    await service.dismiss('flag-1', 'reviewer-1');

    expect(prisma.flag.update).toHaveBeenCalledWith({ where: { id: 'flag-1' }, data: { status: 'dismissed', resolvedBy: 'reviewer-1' } });
  });
});
