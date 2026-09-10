import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { writeAuditLog, type StorageProvider } from '@open-derja/core';
import type { StoredObject, StoredObjectKind } from '@open-derja/db';
import { PrismaService } from '../database/prisma.service';
import { STORAGE_PROVIDER } from './storage.tokens';

const EXT_BY_MIME: Record<string, string> = {
  'application/json': '.json',
  'application/x-ndjson': '.jsonl',
  'application/gzip': '.gz',
  'audio/wav': '.wav',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export interface IssueUploadParams {
  kind: StoredObjectKind;
  mimeType?: string;
  isPublic?: boolean;
  expiresInSeconds?: number;
  uploadedBy?: string;
}

@Injectable()
export class StorageService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider,
  ) {}

  async issueUpload(params: IssueUploadParams): Promise<{ id: string; storageKey: string; uploadUrl: string }> {
    const ext = params.mimeType ? EXT_BY_MIME[params.mimeType] ?? '' : '';
    const storageKey = `${params.kind}/${randomUUID()}${ext}`;
    const bucket = process.env.R2_BUCKET || process.env.STORAGE_LOCAL_DIR || 'local';

    const object = await this.prisma.storedObject.create({
      data: {
        kind: params.kind,
        bucket,
        storageKey,
        mimeType: params.mimeType,
        isPublic: params.isPublic ?? false,
        status: 'pending',
        uploadedBy: params.uploadedBy,
      },
    });

    const uploadUrl = await this.provider.getUploadUrl(storageKey, {
      contentType: params.mimeType,
      expiresInSeconds: params.expiresInSeconds,
    });

    return { id: object.id, storageKey, uploadUrl };
  }

  async confirmUpload(id: string, actorId?: string): Promise<StoredObject> {
    const object = await this.prisma.storedObject.findUnique({ where: { id } });
    if (!object) {
      throw new NotFoundException('Stored object not found');
    }
    if (object.status === 'stored') {
      return object;
    }
    if (object.status === 'deleted') {
      throw new BadRequestException('This upload slot has been swept and cannot be confirmed');
    }

    const head = await this.provider.headObject(object.storageKey);
    if (!head.exists) {
      throw new BadRequestException('No object found in the bucket for this upload — nothing to confirm');
    }

    return this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.storedObject.update({
        where: { id },
        data: {
          status: 'stored',
          confirmedAt: new Date(),
          sizeBytes: head.size !== undefined ? BigInt(head.size) : undefined,
          checksum: head.checksum,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: 'stored_object_confirmed',
        entityType: 'stored_object',
        entityId: id,
        diff: { storageKey: object.storageKey, size: head.size ?? null, checksum: head.checksum ?? null },
      });
      return confirmed;
    });
  }

  async putGenerated(id: string, body: Buffer | string, contentType?: string): Promise<void> {
    const object = await this.prisma.storedObject.findUniqueOrThrow({ where: { id } });
    await this.provider.putObject(object.storageKey, body, contentType);
    await this.confirmUpload(id);
  }

  async issueDownload(id: string, expiresInSeconds?: number): Promise<{ downloadUrl: string }> {
    const object = await this.prisma.storedObject.findUnique({ where: { id } });
    if (!object || object.status !== 'stored') {
      throw new NotFoundException('Stored object not available');
    }
    const downloadUrl = await this.provider.getDownloadUrl(object.storageKey, { expiresInSeconds });
    return { downloadUrl };
  }
}
