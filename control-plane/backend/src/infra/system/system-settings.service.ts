import { Injectable } from '@nestjs/common';
import type { Prisma } from '@open-derja/db';
import { PrismaService } from '../database/prisma.service';

export const SETTING_MAINTENANCE_MODE = 'maintenance_mode';
export const SETTING_PAUSED_TASK_TYPES = 'paused_task_types';
export const SETTING_PUBLICATION_COMMENTS_OPEN = 'publication_comments_open';
export const SETTING_ADJUDICATION_WINDOW_DAYS = 'adjudication_window_days';

export interface MaintenanceModeValue {
  enabled: boolean;
  message: string;
}

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }

  async set(key: string, value: Prisma.InputJsonValue, updatedBy?: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedBy },
      update: { value, updatedBy },
    });
  }

  getMaintenanceMode(): Promise<MaintenanceModeValue> {
    return this.get<MaintenanceModeValue>(SETTING_MAINTENANCE_MODE, { enabled: false, message: '' });
  }

  getPausedTaskTypes(): Promise<string[]> {
    return this.get<string[]>(SETTING_PAUSED_TASK_TYPES, []);
  }
}
