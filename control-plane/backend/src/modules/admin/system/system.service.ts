import { Injectable } from '@nestjs/common';
import { writeAuditLog } from '@open-derja/core';
import type { FeatureAudience, Prisma } from '@open-derja/db';
import { PrismaService } from '../../../infra/database/prisma.service';
import {
  SETTING_MAINTENANCE_MODE,
  SystemSettingsService,
} from '../../../infra/system/system-settings.service';
import { SetMaintenanceDto, UpsertFeatureFlagDto } from '../dto/admin.dto';

@Injectable()
export class SystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async jobs(): Promise<unknown> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT name, state, count(*)::int AS count
       FROM pgboss.job
       GROUP BY name, state
       ORDER BY name, state`,
    ).catch(() => []);
    return { jobs: rows };
  }

  backups(): Promise<unknown[]> {
    return this.prisma.databaseBackup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { storedObject: { select: { sizeBytes: true, checksum: true, bucket: true } } },
    });
  }

  featureFlags(): Promise<unknown[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertFeatureFlag(dto: UpsertFeatureFlagDto, actorId: string): Promise<unknown> {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        enabled: dto.enabled,
        audience: dto.audience as FeatureAudience,
        description: dto.description,
      },
      update: { enabled: dto.enabled, audience: dto.audience as FeatureAudience, description: dto.description },
    });
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'upsert_feature_flag',
      entityType: 'feature_flag',
      entityId: '00000000-0000-0000-0000-000000000000',
      diff: { key: dto.key, enabled: dto.enabled, audience: dto.audience },
    });
    return flag;
  }

  async setMaintenance(dto: SetMaintenanceDto, actorId: string): Promise<unknown> {
    const value = { enabled: dto.enabled, message: dto.message ?? '' };
    await this.systemSettings.set(SETTING_MAINTENANCE_MODE, value, actorId);
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'set_maintenance_mode',
      entityType: 'system_setting',
      entityId: '00000000-0000-0000-0000-000000000000',
      diff: value,
    });
    return value;
  }

  auditLog(filters: { actorId?: string; entityType?: string; action?: string; skip: number; take: number }): Promise<unknown[]> {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: Math.min(filters.take, 200),
    });
  }
}
