export interface PresignedUrlOptions {
  expiresInSeconds?: number;
  contentType?: string;
}

export interface StorageProvider {
  getUploadUrl(key: string, options?: PresignedUrlOptions): Promise<string>;
  getDownloadUrl(key: string, options?: PresignedUrlOptions): Promise<string>;
  delete(key: string): Promise<void>;
}
