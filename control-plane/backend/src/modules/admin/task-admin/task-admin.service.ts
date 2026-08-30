import { Injectable, NotFoundException } from '@nestjs/common';
import { writeAuditLog } from '@open-derja/core';
import type { Region, TaskType } from '@open-derja/db';
import { PrismaService } from '../../../infra/database/prisma.service';
import {
  SETTING_PAUSED_TASK_TYPES,
  SystemSettingsService,
} from '../../../infra/system/system-settings.service';
import { ReprioritiseTasksDto } from '../dto/admin.dto';

@Injectable()
export class TaskAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async reprioritise(dto: ReprioritiseTasksDto, actorId: string): Promise<{ updated: number }> {
    const result = await this.prisma.task.updateMany({
      where: {
        type: dto.type as TaskType,
        status: { in: ['open', 'needs_rework'] },
        ...(dto.targetRegions?.length ? { targetRegions: { hasSome: dto.targetRegions as Region[] } } : {}),
      },
      data: { priority: dto.priority },
    });
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'reprioritise_tasks',
      entityType: 'task_type',
      entityId: '00000000-0000-0000-0000-000000000000',
      diff: { type: dto.type, priority: dto.priority, targetRegions: dto.targetRegions ?? null, updated: result.count },
    });
    return { updated: result.count };
  }

  async forceRelease(taskId: string, actorId: string): Promise<unknown> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    const released = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'open', claimedBy: null, claimedAt: null },
    });
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'force_release_task',
      entityType: 'task',
      entityId: taskId,
      diff: { from: task.claimedBy },
    });
    return released;
  }

  async reassign(taskId: string, userId: string, actorId: string): Promise<unknown> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    const reassigned = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'claimed', claimedBy: userId, claimedAt: new Date() },
    });
    await writeAuditLog(this.prisma, {
      actorId,
      action: 'reassign_task',
      entityType: 'task',
      entityId: taskId,
      diff: { from: task.claimedBy, to: userId },
    });
    return reassigned;
  }

  async pause(type: string, actorId: string): Promise<{ paused: string[] }> {
    const current = await this.systemSettings.getPausedTaskTypes();
    const next = current.includes(type) ? current : [...current, type];
    await this.systemSettings.set(SETTING_PAUSED_TASK_TYPES, next, actorId);
    return { paused: next };
  }

  async resume(type: string, actorId: string): Promise<{ paused: string[] }> {
    const current = await this.systemSettings.getPausedTaskTypes();
    const next = current.filter((t) => t !== type);
    await this.systemSettings.set(SETTING_PAUSED_TASK_TYPES, next, actorId);
    return { paused: next };
  }
}
