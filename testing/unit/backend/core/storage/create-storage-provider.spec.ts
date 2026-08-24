import { createStorageProvider } from '../../../../../backend/core/src/storage/create-storage-provider';
import { LocalStorageProvider } from '../../../../../backend/core/src/storage/local.provider';
import { R2StorageProvider } from '../../../../../backend/core/src/storage/r2.provider';

describe('createStorageProvider', () => {
  it('returns a LocalStorageProvider when STORAGE_PROVIDER=local and required config is present', () => {
    const provider = createStorageProvider({
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_DIR: '/tmp/storage',
      STORAGE_LOCAL_BASE_URL: 'http://localhost:3000',
      STORAGE_LOCAL_SECRET: 'secret',
    });
    expect(provider).toBeInstanceOf(LocalStorageProvider);
  });

  it('returns an R2StorageProvider when STORAGE_PROVIDER=r2 and required config is present', () => {
    const provider = createStorageProvider({
      STORAGE_PROVIDER: 'r2',
      R2_ACCOUNT_ID: 'acct',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET: 'bucket',
    });
    expect(provider).toBeInstanceOf(R2StorageProvider);
  });

  it('throws rather than silently misconfiguring when local config is incomplete', () => {
    expect(() => createStorageProvider({ STORAGE_PROVIDER: 'local' })).toThrow(/STORAGE_LOCAL_DIR/);
  });

  it('throws rather than silently misconfiguring when r2 config is incomplete', () => {
    expect(() => createStorageProvider({ STORAGE_PROVIDER: 'r2' })).toThrow(/R2_ACCOUNT_ID/);
  });

  it('throws on an unknown provider name', () => {
    expect(() => createStorageProvider({ STORAGE_PROVIDER: 'nope' as any })).toThrow(/unknown STORAGE_PROVIDER/);
  });
});
