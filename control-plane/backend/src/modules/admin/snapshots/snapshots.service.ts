import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { collectSnapshotJsonl, writeAuditLog } from '@open-derja/core';
import { PrismaService } from '../../../infra/database/prisma.service';
import { StorageService } from '../../../infra/storage/storage.service';
import { CreateSnapshotDto, DeprecateSnapshotDto } from '../dto/admin.dto';

@Injectable()
export class SnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(): Promise<unknown[]> {
    return this.prisma.datasetSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      include: { storedObject: { select: { status: true, checksum: true, sizeBytes: true } } },
    });
  }

  async create(dto: CreateSnapshotDto, actorId: string): Promise<unknown> {
    const existing = await this.prisma.datasetSnapshot.findFirst({ where: { version: dto.version } });
    if (existing) {
      throw new ConflictException(`Snapshot version "${dto.version}" already exists`);
    }

    const [corpusItemCount, latestRule] = await Promise.all([
      this.prisma.corpusItem.count(),
      this.prisma.standardisationRule.findFirst({ orderBy: { ruleVersion: 'desc' }, select: { ruleVersion: true } }),
    ]);
    const ruleVersion = latestRule?.ruleVersion ?? 0;

    const upload = await this.storage.issueUpload({
      kind: 'dataset_snapshot',
      mimeType: 'application/x-ndjson',
      uploadedBy: actorId,
    });

    const snapshot = await this.prisma.$transaction(async (tx) => {
      const created = await tx.datasetSnapshot.create({
        data: {
          version: dto.version,
          corpusItemCount,
          ruleVersion,
          notes: dto.notes,
          storedObjectId: upload.id,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: 'create_snapshot',
        entityType: 'dataset_snapshot',
        entityId: created.id,
        diff: { version: dto.version, corpusItemCount, ruleVersion },
      });
      return created;
    });

    const { body, lines } = await collectSnapshotJsonl(this.prisma);
    await this.storage.putGenerated(upload.id, body, 'application/x-ndjson');
    const checksum = createHash('sha256').update(body).digest('hex');

    return {
      ...snapshot,
      exportStatus: 'stored',
      exportLines: lines,
      checksum,
      note: 'Full-tier JSONL export written and confirmed. Tier filtering (commercially-clean/etymology/per-region) and Hugging Face push not wired yet.',
    };
  }

  async diff(aId: string, bId: string): Promise<unknown> {
    const [a, b] = await Promise.all([
      this.prisma.datasetSnapshot.findUnique({ where: { id: aId } }),
      this.prisma.datasetSnapshot.findUnique({ where: { id: bId } }),
    ]);
    if (!a || !b) throw new NotFoundException('One or both snapshots not found');
    return {
      corpusItemCountDelta: b.corpusItemCount - a.corpusItemCount,
      ruleVersionDelta: b.ruleVersion - a.ruleVersion,
      from: { id: a.id, version: a.version },
      to: { id: b.id, version: b.version },
    };
  }

  async deprecate(id: string, dto: DeprecateSnapshotDto, actorId: string): Promise<unknown> {
    const snapshot = await this.prisma.datasetSnapshot.findUnique({ where: { id } });
    if (!snapshot) throw new NotFoundException('Snapshot not found');
    const updated = await this.prisma.datasetSnapshot.update({
      where: { id },
      data: { notes: `${snapshot.notes ?? ''}\n[DEPRECATED] ${dto.reason}`.trim() },
    });
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'deprecate_snapshot',
      entityType: 'dataset_snapshot',
      entityId: id,
      diff: { reason: dto.reason },
    });
    return updated;
  }
}
