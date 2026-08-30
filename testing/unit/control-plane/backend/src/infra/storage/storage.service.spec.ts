import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../../../../../../../control-plane/backend/src/infra/storage/storage.service';

function makeProvider(head: { exists: boolean; size?: number; checksum?: string } = { exists: true, size: 10, checksum: 'abc' }) {
  return {
    getUploadUrl: jest.fn().mockResolvedValue('https://bucket/upload'),
    getDownloadUrl: jest.fn().mockResolvedValue('https://bucket/download'),
    headObject: jest.fn().mockResolvedValue(head),
    delete: jest.fn(),
  } as never;
}

function makePrisma(object: unknown) {
  return {
    storedObject: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'so1', ...data })),
      findUnique: jest.fn().mockResolvedValue(object),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'so1', ...data })),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation((cb) =>
      cb({ storedObject: { update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'so1', ...data })) }, auditLog: { create: jest.fn() } }),
    ),
  };
}

describe('StorageService', () => {
  it('issues a pending StoredObject row and a presigned upload URL', async () => {
    const prisma = makePrisma(null);
    const provider = makeProvider();
    const service = new StorageService(prisma as never, provider);

    const result = await service.issueUpload({ kind: 'other', mimeType: 'application/json' });

    expect(result.uploadUrl).toBe('https://bucket/upload');
    expect(result.storageKey).toMatch(/^other\/.*\.json$/);
    expect(prisma.storedObject.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending', kind: 'other' }) }),
    );
  });

  it('confirmUpload re-checks the bucket and refuses when the object is absent (never trusts the client)', async () => {
    const prisma = makePrisma({ id: 'so1', status: 'pending', storageKey: 'other/x.json' });
    const provider = makeProvider({ exists: false });
    const service = new StorageService(prisma as never, provider);

    await expect(service.confirmUpload('so1')).rejects.toThrow(BadRequestException);
    expect(provider.headObject).toHaveBeenCalledWith('other/x.json');
  });

  it('confirmUpload flips to stored with the bucket-reported size and checksum', async () => {
    const prisma = makePrisma({ id: 'so1', status: 'pending', storageKey: 'other/x.json' });
    const service = new StorageService(prisma as never, makeProvider({ exists: true, size: 42, checksum: 'deadbeef' }));

    const confirmed = (await service.confirmUpload('so1', 'actor')) as { status: string; checksum: string };
    expect(confirmed.status).toBe('stored');
    expect(confirmed.checksum).toBe('deadbeef');
  });

  it('confirmUpload is idempotent for an already-stored object', async () => {
    const prisma = makePrisma({ id: 'so1', status: 'stored', storageKey: 'other/x.json' });
    const service = new StorageService(prisma as never, makeProvider());
    await expect(service.confirmUpload('so1')).resolves.toEqual(expect.objectContaining({ status: 'stored' }));
  });

  it('issueDownload refuses an object that is not stored', async () => {
    const prisma = makePrisma({ id: 'so1', status: 'pending', storageKey: 'other/x.json' });
    const service = new StorageService(prisma as never, makeProvider());
    await expect(service.issueDownload('so1')).rejects.toThrow(NotFoundException);
  });
});
