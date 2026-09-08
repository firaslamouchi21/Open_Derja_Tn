import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewLanesService } from '../../../../../../../../control-plane/backend/src/modules/admin/review-lanes/review-lanes.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    correction: { findMany: jest.fn().mockResolvedValue([]) },
    lexiconOrigin: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    publication: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    flag: { findMany: jest.fn().mockResolvedValue([]) },
    publicationComment: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    ...overrides,
  } as any;
}

function makeCorrections() {
  return { accept: jest.fn().mockResolvedValue({ accepted: true }), reject: jest.fn().mockResolvedValue({ rejected: true }) } as any;
}

function makeFlags() {
  return { resolve: jest.fn().mockResolvedValue({ resolved: true }), dismiss: jest.fn().mockResolvedValue({ dismissed: true }) } as any;
}

function makeSystemSettings() {
  return { set: jest.fn().mockResolvedValue(undefined) } as any;
}

function makeService(prisma = makePrisma(), corrections = makeCorrections(), flags = makeFlags(), systemSettings = makeSystemSettings()) {
  return new ReviewLanesService(prisma, corrections, flags, systemSettings);
}

describe('ReviewLanesService.lane', () => {
  it('gathers all four proposed/open queues in parallel', async () => {
    const prisma = makePrisma({
      correction: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) },
      flag: { findMany: jest.fn().mockResolvedValue([{ id: 'f1' }]) },
    });
    const service = makeService(prisma);

    const result = await service.lane();

    expect(result.corrections).toEqual([{ id: 'c1' }]);
    expect(result.flags).toEqual([{ id: 'f1' }]);
    expect(prisma.correction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'proposed' } }));
    expect(prisma.flag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'open' } }));
  });
});

describe('ReviewLanesService.resolve', () => {
  it('delegates a correction accept/reject to CorrectionsService', async () => {
    const corrections = makeCorrections();
    const service = makeService(makePrisma(), corrections);

    await service.resolve('correction', 'c1', 'accept', 'actor-1');
    await service.resolve('correction', 'c1', 'reject', 'actor-1');

    expect(corrections.accept).toHaveBeenCalledWith('c1', 'actor-1');
    expect(corrections.reject).toHaveBeenCalledWith('c1', 'actor-1');
  });

  it('delegates a flag accept/reject to FlagsService resolve/dismiss', async () => {
    const flags = makeFlags();
    const service = makeService(makePrisma(), makeCorrections(), flags);

    await service.resolve('flag', 'f1', 'accept', 'actor-1');
    await service.resolve('flag', 'f1', 'reject', 'actor-1');

    expect(flags.resolve).toHaveBeenCalledWith('f1', 'actor-1');
    expect(flags.dismiss).toHaveBeenCalledWith('f1', 'actor-1');
  });

  it('throws when resolving an origin that does not exist', async () => {
    const prisma = makePrisma({ lexiconOrigin: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
    const service = makeService(prisma);

    await expect(service.resolve('origin', 'o1', 'accept', 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('confirms an accepted origin and disputes a rejected one', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = makePrisma({ lexiconOrigin: { findUnique: jest.fn().mockResolvedValue({ id: 'o1' }), update } });
    const service = makeService(prisma);

    await service.resolve('origin', 'o1', 'accept', 'actor-1');
    expect(update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'confirmed' } });

    await service.resolve('origin', 'o1', 'reject', 'actor-1');
    expect(update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'disputed' } });
  });

  it('throws when resolving a publication that does not exist', async () => {
    const prisma = makePrisma({ publication: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
    const service = makeService(prisma);

    await expect(service.resolve('publication', 'p1', 'accept', 'actor-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects an unknown lane type', async () => {
    const service = makeService();

    await expect(service.resolve('bogus' as any, 'x', 'accept', 'actor-1')).rejects.toThrow(BadRequestException);
  });
});

describe('ReviewLanesService.moderateComment', () => {
  it('throws when the comment does not exist', async () => {
    const prisma = makePrisma({ publicationComment: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
    const service = makeService(prisma);

    await expect(service.moderateComment('c1', 'approve')).rejects.toThrow(NotFoundException);
  });

  it('approves or rejects an existing comment', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = makePrisma({ publicationComment: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }), update } });
    const service = makeService(prisma);

    await service.moderateComment('c1', 'approve');
    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'approved' } });
  });
});

describe('ReviewLanesService.setCommentsOpen', () => {
  it('writes the publication_comments_open setting', async () => {
    const systemSettings = makeSystemSettings();
    const service = makeService(makePrisma(), makeCorrections(), makeFlags(), systemSettings);

    const result = await service.setCommentsOpen(true, 'actor-1');

    expect(result).toEqual({ open: true });
    expect(systemSettings.set).toHaveBeenCalledWith('publication_comments_open', true, 'actor-1');
  });
});
