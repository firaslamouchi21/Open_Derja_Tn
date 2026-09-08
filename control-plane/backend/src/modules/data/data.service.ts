import { Injectable, NotFoundException } from '@nestjs/common';
import { listPublicSnapshots, type PublicSnapshotListing } from '@open-derja/core';
import { PrismaService } from '../../infra/database/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(): Promise<PublicSnapshotListing[]> {
    return listPublicSnapshots(this.prisma);
  }

  async download(id: string): Promise<{ downloadUrl: string }> {
    const snapshot = await this.prisma.datasetSnapshot.findUnique({ where: { id }, select: { storedObjectId: true } });
    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }
    return this.storage.issueDownload(snapshot.storedObjectId);
  }
}
