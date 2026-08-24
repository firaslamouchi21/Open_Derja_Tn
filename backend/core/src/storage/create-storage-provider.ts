import { LocalStorageProvider } from './local.provider';
import type { StorageProvider } from './provider';
import { R2StorageProvider } from './r2.provider';

export interface StorageEnv {
  STORAGE_PROVIDER: 'local' | 'r2';
  STORAGE_LOCAL_DIR?: string;
  STORAGE_LOCAL_BASE_URL?: string;
  STORAGE_LOCAL_SECRET?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
}

function required(env: StorageEnv, key: keyof StorageEnv): string {
  const value = env[key];
  if (!value) throw new Error(`storage: ${key} is required when STORAGE_PROVIDER=${env.STORAGE_PROVIDER}`);
  return value;
}

export function createStorageProvider(env: StorageEnv): StorageProvider {
  if (env.STORAGE_PROVIDER === 'r2') {
    return new R2StorageProvider({
      accountId: required(env, 'R2_ACCOUNT_ID'),
      accessKeyId: required(env, 'R2_ACCESS_KEY_ID'),
      secretAccessKey: required(env, 'R2_SECRET_ACCESS_KEY'),
      bucket: required(env, 'R2_BUCKET'),
    });
  }

  if (env.STORAGE_PROVIDER === 'local') {
    return new LocalStorageProvider({
      baseDir: required(env, 'STORAGE_LOCAL_DIR'),
      baseUrl: required(env, 'STORAGE_LOCAL_BASE_URL'),
      secret: required(env, 'STORAGE_LOCAL_SECRET'),
    });
  }

  throw new Error(`storage: unknown STORAGE_PROVIDER "${env.STORAGE_PROVIDER}"`);
}
