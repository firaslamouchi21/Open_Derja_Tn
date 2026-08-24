import { createHmac, timingSafeEqual } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { PresignedUrlOptions, StorageProvider } from './provider';

export interface LocalStorageConfig {
  baseDir: string;
  baseUrl: string;
  secret: string;
}

const DEFAULT_EXPIRY_SECONDS = 900;

function sign(key: string, expiresAt: number, secret: string): string {
  return createHmac('sha256', secret).update(`${key}:${expiresAt}`).digest('hex');
}

export function verifyLocalStorageToken(
  key: string,
  expiresAt: number,
  signature: string,
  secret: string,
): boolean {
  if (Date.now() > expiresAt) return false;
  const expected = Buffer.from(sign(key, expiresAt, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: LocalStorageConfig) {}

  private buildUrl(action: 'upload' | 'download', key: string, options: PresignedUrlOptions): string {
    const expiresAt = Date.now() + (options.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS) * 1000;
    const signature = sign(key, expiresAt, this.config.secret);
    const params = new URLSearchParams({ exp: String(expiresAt), sig: signature });
    return `${this.config.baseUrl}/storage/${action}/${encodeURIComponent(key)}?${params.toString()}`;
  }

  async getUploadUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    return this.buildUrl('upload', key, options);
  }

  async getDownloadUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    return this.buildUrl('download', key, options);
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.config.baseDir, key), { force: true });
  }
}
