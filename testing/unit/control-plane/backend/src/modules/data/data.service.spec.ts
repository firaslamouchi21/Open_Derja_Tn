import * as core from '@open-derja/core';
import { DataService } from '../../../../../../../control-plane/backend/src/modules/data/data.service';

jest.mock(
  '@open-derja/core',
  () => ({
    listPublicSnapshots: jest.fn().mockResolvedValue([]),
  }),
  { virtual: true },
);
const mockedCore = core as jest.Mocked<typeof core>;

beforeEach(() => jest.clearAllMocks());

describe('DataService', () => {
  it('delegates listing to listPublicSnapshots', async () => {
    const prisma = {} as any;
    const storage = {} as any;
    const service = new DataService(prisma, storage);

    await service.list();

    expect(mockedCore.listPublicSnapshots).toHaveBeenCalledWith(prisma);
  });

  it('issues a download URL for a real snapshot by looking up its stored object', async () => {
    const prisma = {
      datasetSnapshot: { findUnique: jest.fn().mockResolvedValue({ storedObjectId: 'obj-1' }) },
    } as any;
    const storage = { issueDownload: jest.fn().mockResolvedValue({ downloadUrl: 'https://example.test/x' }) } as any;
    const service = new DataService(prisma, storage);

    const result = await service.download('snap-1');

    expect(prisma.datasetSnapshot.findUnique).toHaveBeenCalledWith({
      where: { id: 'snap-1' },
      select: { storedObjectId: true },
    });
    expect(storage.issueDownload).toHaveBeenCalledWith('obj-1');
    expect(result).toEqual({ downloadUrl: 'https://example.test/x' });
  });

  it('throws NotFoundException rather than calling storage for an unknown snapshot id', async () => {
    const prisma = { datasetSnapshot: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const storage = { issueDownload: jest.fn() } as any;
    const service = new DataService(prisma, storage);

    await expect(service.download('missing')).rejects.toThrow('Snapshot not found');
    expect(storage.issueDownload).not.toHaveBeenCalled();
  });
});
