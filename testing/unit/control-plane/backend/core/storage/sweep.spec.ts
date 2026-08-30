import { sweepPendingUploads } from '../../../../../../control-plane/backend/core/src/storage/sweep';

function makePrisma(stale: Array<{ id: string; storageKey: string; sizeBytes: null; checksum: null }>) {
  return {
    storedObject: {
      findMany: jest.fn().mockResolvedValue(stale),
      update: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  } as never;
}

describe('sweepPendingUploads', () => {
  it('confirms rows that made it to the bucket and abandons the rest', async () => {
    const prisma = makePrisma([
      { id: 'a', storageKey: 'other/a', sizeBytes: null, checksum: null },
      { id: 'b', storageKey: 'other/b', sizeBytes: null, checksum: null },
    ]);
    const provider = {
      headObject: jest
        .fn()
        .mockResolvedValueOnce({ exists: true, size: 5, checksum: 'x' })
        .mockResolvedValueOnce({ exists: false }),
    } as never;

    const result = await sweepPendingUploads(prisma, provider);

    expect(result).toEqual({ confirmed: 1, deleted: 1 });
    expect((prisma as { storedObject: { update: jest.Mock } }).storedObject.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a' }, data: expect.objectContaining({ status: 'stored' }) }),
    );
    expect((prisma as { storedObject: { update: jest.Mock } }).storedObject.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b' }, data: expect.objectContaining({ status: 'deleted' }) }),
    );
  });

  it('does nothing when there are no stale pending rows', async () => {
    const prisma = makePrisma([]);
    const provider = { headObject: jest.fn() } as never;
    expect(await sweepPendingUploads(prisma, provider)).toEqual({ confirmed: 0, deleted: 0 });
    expect((provider as { headObject: jest.Mock }).headObject).not.toHaveBeenCalled();
  });
});
