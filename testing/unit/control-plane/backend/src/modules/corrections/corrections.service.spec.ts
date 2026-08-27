import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CorrectionsService } from '../../../../../../../control-plane/backend/src/modules/corrections/corrections.service';

function makePrisma() {
  const prisma: any = {
    correction: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    corpusItem: { update: jest.fn() },
    lexiconEntry: { update: jest.fn() },
    lexiconVariant: { update: jest.fn() },
    document: { update: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  };
  return prisma;
}

describe('CorrectionsService.propose', () => {
  it('creates a correction record, attaching the proposer when authenticated', async () => {
    const prisma = makePrisma();
    prisma.correction.create.mockResolvedValue({ id: 'c1' });
    const service = new CorrectionsService(prisma);

    const dto = { targetTable: 'corpus_items', targetId: 'item-1', field: 'canonicalForm', newValue: 'x' } as any;
    await service.propose(dto, 'user-1');

    expect(prisma.correction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ targetTable: 'corpus_items', proposedBy: 'user-1' }),
    });
  });

  it('creates an anonymous correction record when no proposer is given', async () => {
    const prisma = makePrisma();
    prisma.correction.create.mockResolvedValue({ id: 'c1' });
    const service = new CorrectionsService(prisma);

    await service.propose({ targetTable: 'corpus_items', targetId: 'item-1', field: 'canonicalForm' } as any);

    expect(prisma.correction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ proposedBy: undefined }),
    });
  });
});

describe('CorrectionsService.accept', () => {
  it('throws NotFoundException when the correction does not exist', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue(null);
    const service = new CorrectionsService(prisma);

    await expect(service.accept('ghost', 'reviewer-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects a correction targeting a table not on the whitelist', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue({
      id: 'c1',
      targetTable: 'users',
      targetId: 'u1',
      field: 'role',
      newValue: 'admin',
    });
    const service = new CorrectionsService(prisma);

    await expect(service.accept('c1', 'reviewer-1')).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a correction targeting a field not on that table\'s whitelist', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue({
      id: 'c1',
      targetTable: 'corpus_items',
      targetId: 'item-1',
      field: 'text',
      newValue: 'sneaky rewrite',
    });
    const service = new CorrectionsService(prisma);

    await expect(service.accept('c1', 'reviewer-1')).rejects.toThrow(BadRequestException);
  });

  it('applies a whitelisted correction to corpus_items and bumps its version', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue({
      id: 'c1',
      targetTable: 'corpus_items',
      targetId: 'item-1',
      field: 'canonicalForm',
      newValue: 'شنوة',
    });
    prisma.correction.update.mockResolvedValue({ id: 'c1', status: 'accepted' });

    const service = new CorrectionsService(prisma);
    const result = await service.accept('c1', 'reviewer-1');

    expect(prisma.corpusItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { canonicalForm: 'شنوة' },
    });
    expect(prisma.corpusItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { version: { increment: 1 } },
    });
    expect(prisma.correction.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'accepted', reviewedBy: 'reviewer-1' },
    });
    expect(result).toEqual({ id: 'c1', status: 'accepted' });
  });

  it('applies a whitelisted correction to lexicon_entries without bumping any version', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue({
      id: 'c1',
      targetTable: 'lexicon_entries',
      targetId: 'entry-1',
      field: 'glossEn',
      newValue: 'hello',
    });
    prisma.correction.update.mockResolvedValue({ id: 'c1', status: 'accepted' });

    const service = new CorrectionsService(prisma);
    await service.accept('c1', 'reviewer-1');

    expect(prisma.lexiconEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { glossEn: 'hello' },
    });
    expect(prisma.corpusItem.update).not.toHaveBeenCalled();
  });
});

describe('CorrectionsService.reject', () => {
  it('throws NotFoundException when the correction does not exist', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue(null);
    const service = new CorrectionsService(prisma);

    await expect(service.reject('ghost', 'reviewer-1')).rejects.toThrow(NotFoundException);
  });

  it('marks an existing correction rejected', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.correction.update.mockResolvedValue({ id: 'c1', status: 'rejected' });
    const service = new CorrectionsService(prisma);

    const result = await service.reject('c1', 'reviewer-1');

    expect(prisma.correction.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'rejected', reviewedBy: 'reviewer-1' },
    });
    expect(result).toEqual({ id: 'c1', status: 'rejected' });
  });
});

describe('CorrectionsService.findAll / findOne', () => {
  it('filters by status when given, and lists everything when not', async () => {
    const prisma = makePrisma();
    prisma.correction.findMany.mockResolvedValue([]);
    const service = new CorrectionsService(prisma);

    await service.findAll('accepted' as any);
    expect(prisma.correction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'accepted' } }));

    await service.findAll();
    expect(prisma.correction.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: undefined }));
  });

  it('throws NotFoundException from findOne when the correction is missing', async () => {
    const prisma = makePrisma();
    prisma.correction.findUnique.mockResolvedValue(null);
    const service = new CorrectionsService(prisma);

    await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
  });
});
