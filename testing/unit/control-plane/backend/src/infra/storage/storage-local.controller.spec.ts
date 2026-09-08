import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';

jest.mock(
  '@open-derja/core',
  () => ({
    verifyLocalStorageToken: jest.fn(),
    LocalStorageProvider: jest.fn().mockImplementation(() => ({ resolvePath: (key: string) => `/tmp/store/${key}` })),
  }),
  { virtual: true },
);

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

const mockCreateReadStream = jest.fn();
jest.mock('node:fs', () => ({
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}));

import { mkdir, writeFile } from 'node:fs/promises';
import { StorageLocalController } from '../../../../../../../control-plane/backend/src/infra/storage/storage-local.controller';

const mockedCore = core as jest.Mocked<typeof core>;

const ORIGINAL_ENV = { ...process.env };

function setLocalModeEnv() {
  process.env.STORAGE_PROVIDER = 'local';
  process.env.STORAGE_LOCAL_SECRET = 'test-secret-at-least-this-long';
  process.env.STORAGE_LOCAL_DIR = '/tmp/store';
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.clearAllMocks();
});

describe('StorageLocalController — local-mode gate', () => {
  it('refuses every route when STORAGE_PROVIDER is not local', async () => {
    process.env.STORAGE_PROVIDER = 'r2';
    const controller = new StorageLocalController();
    const req: any = { body: Buffer.from('x') };

    await expect(controller.upload('k', '1', 'sig', req)).rejects.toThrow(NotFoundException);
  });

  it('refuses when local mode is set but the secret/dir env vars are missing', async () => {
    process.env.STORAGE_PROVIDER = 'local';
    delete process.env.STORAGE_LOCAL_SECRET;
    const controller = new StorageLocalController();
    const req: any = { body: Buffer.from('x') };

    await expect(controller.upload('k', '1', 'sig', req)).rejects.toThrow(NotFoundException);
  });
});

describe('StorageLocalController.upload', () => {
  it('rejects an invalid or expired signature before touching the filesystem', async () => {
    setLocalModeEnv();
    mockedCore.verifyLocalStorageToken.mockReturnValue(false);
    const controller = new StorageLocalController();
    const req: any = { body: Buffer.from('x') };

    await expect(controller.upload('k', '1', 'sig', req)).rejects.toThrow(BadRequestException);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects a non-buffer body even with a valid signature', async () => {
    setLocalModeEnv();
    mockedCore.verifyLocalStorageToken.mockReturnValue(true);
    const controller = new StorageLocalController();
    const req: any = { body: 'not a buffer' };

    await expect(controller.upload('k', '1', 'sig', req)).rejects.toThrow(BadRequestException);
  });

  it('writes the bytes to the resolved path on a valid signed request', async () => {
    setLocalModeEnv();
    mockedCore.verifyLocalStorageToken.mockReturnValue(true);
    const controller = new StorageLocalController();
    const body = Buffer.from('hello world');
    const req: any = { body };

    const result = await controller.upload('my-key', '123', 'sig', req);

    expect(mkdir).toHaveBeenCalledWith('/tmp/store', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith('/tmp/store/my-key', body);
    expect(result).toEqual({ stored: 'my-key', bytes: 11 });
  });
});

describe('StorageLocalController.download', () => {
  it('rejects an invalid signature before touching the filesystem', () => {
    setLocalModeEnv();
    mockedCore.verifyLocalStorageToken.mockReturnValue(false);
    const controller = new StorageLocalController();
    const res: any = {};

    expect(() => controller.download('k', '1', 'sig', res)).toThrow(BadRequestException);
    expect(mockCreateReadStream).not.toHaveBeenCalled();
  });

  it('streams the resolved file to the response on a valid signature', () => {
    setLocalModeEnv();
    mockedCore.verifyLocalStorageToken.mockReturnValue(true);
    const stream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() };
    mockCreateReadStream.mockReturnValue(stream);
    const controller = new StorageLocalController();
    const res: any = {};

    controller.download('my-key', '123', 'sig', res);

    expect(mockCreateReadStream).toHaveBeenCalledWith('/tmp/store/my-key');
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });
});
