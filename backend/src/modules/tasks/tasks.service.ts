import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  claimNextTask,
  completeTask,
  getClaimableTaskRole,
  getEligibleTaskTypes,
  onConsensusLowAgreement,
  onRegionTagDone,
  onReviewApproved,
  refreshConsensus,
  rejectTask,
  requestRework,
  spawnTasks,
} from '@open-derja/core';
import type { Region, TagKind, Task } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import { AnnotationsService } from '../annotations/annotations.service';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { ReviewTaskDto } from './dto/review-task.dto';
import { RegionTagTaskDto } from './dto/region-tag-task.dto';
import { ConfirmTaskDto } from './dto/confirm-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly annotations: AnnotationsService,
  ) {}

  async claim(user: RequestUser): Promise<Task | undefined> {
    const eligibleTypes = getEligibleTaskTypes(user);
    const role = getClaimableTaskRole(user.role);
    return claimNextTask(this.prisma, { userId: user.id, role, types: eligibleTypes });
  }

  async complete(user: RequestUser, taskId: string, outputRecordId?: string): Promise<Task> {
    await this.assertClaimedByUser(user, taskId);
    return completeTask(this.prisma, taskId, user.id, outputRecordId);
  }

  async review(user: RequestUser, taskId: string, dto: ReviewTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    if (task.type !== 'review') {
      throw new BadRequestException('This task is not a review task');
    }

    if (!dto.approved) {
      return rejectTask(this.prisma, taskId);
    }

    const corpusItem = await this.prisma.corpusItem.findUniqueOrThrow({ where: { id: task.corpusItemId } });

    const [completedTask] = await this.prisma.$transaction(async (tx) => {
      if (dto.qualityValue) {
        await this.annotations.addFullSpanTag(
          {
            corpusItemId: task.corpusItemId,
            kind: 'quality',
            value: dto.qualityValue,
            textLength: corpusItem.text.length,
            annotatorId: user.id,
            isMachine: false,
          },
          tx,
        );
      }
      if (dto.regions && dto.regions.length > 0) {
        await this.annotations.addRegionTags(
          {
            corpusItemId: task.corpusItemId,
            regions: dto.regions,
            textLength: corpusItem.text.length,
            annotatorId: user.id,
            isMachine: false,
          },
          tx,
        );
      }
      const done = await completeTask(tx, taskId, user.id);
      return [done];
    });

    await spawnTasks(this.prisma, onReviewApproved(task.corpusItemId, corpusItem.version));

    if (dto.qualityValue) {
      await this.refreshConsensusAndMaybeAdjudicate(task.corpusItemId, corpusItem.version, 'quality', 0, corpusItem.text.length);
    }
    if (dto.regions && dto.regions.length > 0) {
      await this.refreshConsensusAndMaybeAdjudicate(task.corpusItemId, corpusItem.version, 'region', 0, corpusItem.text.length);
    }

    return completedTask;
  }

  async regionTag(user: RequestUser, taskId: string, dto: RegionTagTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    if (task.type !== 'region_tag') {
      throw new BadRequestException('This task is not a region_tag task');
    }

    const corpusItem = await this.prisma.corpusItem.findUniqueOrThrow({ where: { id: task.corpusItemId } });

    const [completedTask] = await this.prisma.$transaction(async (tx) => {
      await this.annotations.addRegionTags(
        {
          corpusItemId: task.corpusItemId,
          regions: dto.regions,
          textLength: corpusItem.text.length,
          annotatorId: user.id,
          isMachine: false,
        },
        tx,
      );
      const done = await completeTask(tx, taskId, user.id);
      return [done];
    });

    await spawnTasks(this.prisma, onRegionTagDone(task.corpusItemId, corpusItem.version));
    await this.refreshConsensusAndMaybeAdjudicate(task.corpusItemId, corpusItem.version, 'region', 0, corpusItem.text.length);

    return completedTask;
  }

  async confirm(user: RequestUser, taskId: string, dto: ConfirmTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    if (task.type !== 'confirm') {
      throw new BadRequestException('This task is not a confirm task');
    }

    const corpusItem = await this.prisma.corpusItem.findUniqueOrThrow({ where: { id: task.corpusItemId } });

    let regionsToWrite: typeof dto.regions;
    if (dto.agrees) {
      const existing = await this.prisma.tag.findMany({
        where: {
          corpusItemId: task.corpusItemId,
          kind: 'region',
          charStart: 0,
          charEnd: corpusItem.text.length,
        },
        select: { value: true },
        distinct: ['value'],
      });
      regionsToWrite = existing.map((row) => row.value) as typeof dto.regions;
    } else {
      regionsToWrite = dto.regions;
    }

    const completedTask = await this.prisma.$transaction(async (tx) => {
      if (regionsToWrite && regionsToWrite.length > 0) {
        await this.annotations.addRegionTags(
          {
            corpusItemId: task.corpusItemId,
            regions: regionsToWrite,
            textLength: corpusItem.text.length,
            annotatorId: user.id,
            isMachine: false,
          },
          tx,
        );
      }
      return completeTask(tx, taskId, user.id);
    });

    if (regionsToWrite && regionsToWrite.length > 0) {
      await this.refreshConsensusAndMaybeAdjudicate(task.corpusItemId, corpusItem.version, 'region', 0, corpusItem.text.length);
    }

    return completedTask;
  }

  async rework(taskId: string): Promise<Task> {
    await this.assertExists(taskId);
    return requestRework(this.prisma, taskId);
  }

  async reject(taskId: string): Promise<Task> {
    await this.assertExists(taskId);
    return rejectTask(this.prisma, taskId);
  }

  private async refreshConsensusAndMaybeAdjudicate(
    corpusItemId: string,
    itemVersion: number,
    kind: TagKind,
    charStart: number,
    charEnd: number,
  ): Promise<void> {
    const result = await refreshConsensus(this.prisma, { corpusItemId, kind, charStart, charEnd });
    if (result.needsAdjudication) {
      const targetRegions = kind === 'region' ? (result.allValues as Region[]) : [];
      await spawnTasks(this.prisma, onConsensusLowAgreement(corpusItemId, itemVersion, charStart, charEnd, targetRegions));
    }
  }

  private async assertExists(taskId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private async assertClaimedByUser(user: RequestUser, taskId: string): Promise<Task> {
    const task = await this.assertExists(taskId);
    if (task.status !== 'claimed' || task.claimedBy !== user.id) {
      throw new ForbiddenException('You do not hold the active claim on this task');
    }
    return task;
  }
}
