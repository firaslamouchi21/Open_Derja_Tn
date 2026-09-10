export interface PresignedUrlOptions {
  expiresInSeconds?: number;
  contentType?: string;
}

export interface HeadObjectResult {
  exists: boolean;
  size?: number;
  checksum?: string;
  contentType?: string;
}

export interface StorageProvider {
  getUploadUrl(key: string, options?: PresignedUrlOptions): Promise<string>;
  getDownloadUrl(key: string, options?: PresignedUrlOptions): Promise<string>;
  headObject(key: string): Promise<HeadObjectResult>;
  putObject(key: string, body: Buffer | string, contentType?: string): Promise<void>;
  delete(key: string): Promise<void>;
}
