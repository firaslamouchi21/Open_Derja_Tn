import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { HeadObjectResult, PresignedUrlOptions, StorageProvider } from './provider';

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

  private safePathForKey(key: string): string {
    const baseDir = resolve(this.config.baseDir);
    const candidate = resolve(baseDir, key);
    const rel = relative(baseDir, candidate);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error('Invalid storage key path');
    }
    return candidate;
  }

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

  async headObject(key: string): Promise<HeadObjectResult> {
    const path = this.safePathForKey(key);
    try {
      const stats = await stat(path);
      const checksum = createHash('sha256').update(await readFile(path)).digest('hex');
      return { exists: true, size: stats.size, checksum };
    } catch {
      return { exists: false };
    }
  }

  resolvePath(key: string): string {
    return this.safePathForKey(key);
  }

  async putObject(key: string, body: Buffer | string): Promise<void> {
    const path = this.safePathForKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async delete(key: string): Promise<void> {
    await rm(this.safePathForKey(key), { force: true });
  }
}
