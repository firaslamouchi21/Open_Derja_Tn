import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  addFullSpanTag,
  addLink,
  addRegionTags,
  addTag,
  addToken,
  claimNextTask,
  completeTask,
  computeCanonicalMap,
  createLexiconForm,
  createTranslation,
  currentRuleVersion,
  attestLexiconVariantRegion,
  getActiveStandardisationRules,
  getClaimableTaskRole,
  getEligibleTaskTypes,
  onConsensusLowAgreement,
  onCorpusItemStandardised,
  onRegionTagDone,
  onReviewApproved,
  onTranslationAdded,
  parseSpanSlot,
  refreshConsensus,
  rejectTask,
  requestRework,
  spawnTasks,
  tokenize,
} from '@open-derja/core';
import type { Prisma, Region, Script, TagKind, TargetLang, Task, TaskType } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { ReviewTaskDto } from './dto/review-task.dto';
import { RegionTagTaskDto } from './dto/region-tag-task.dto';
import { ConfirmTaskDto } from './dto/confirm-task.dto';
import { TranslateTaskDto } from './dto/translate-task.dto';
import { StandardiseTaskDto } from './dto/standardise-task.dto';
import { LinkLemmaTaskDto } from './dto/link-lemma-task.dto';
import { AdjudicateTaskDto } from './dto/adjudicate-task.dto';
import { TransliterateTaskDto } from './dto/transliterate-task.dto';

const TRANSLATE_TASK_LANGS: Partial<Record<TaskType, TargetLang>> = {
  translate_msa: 'msa',
  translate_fr: 'fr',
  translate_en: 'en',
};

const TRANSLITERATE_TASK_SCRIPTS: Partial<Record<TaskType, Script>> = {
  transliterate_to_arabic: 'arabic',
  transliterate_to_arabizi: 'arabizi',
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

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
        await addFullSpanTag(tx, {
          corpusItemId: task.corpusItemId,
          kind: 'quality',
          value: dto.qualityValue,
          textLength: corpusItem.text.length,
          annotatorId: user.id,
          isMachine: false,
        });
      }
      if (dto.regions && dto.regions.length > 0) {
        await addRegionTags(tx, {
          corpusItemId: task.corpusItemId,
          regions: dto.regions,
          textLength: corpusItem.text.length,
          annotatorId: user.id,
          isMachine: false,
        });
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
      await addRegionTags(tx, {
        corpusItemId: task.corpusItemId,
        regions: dto.regions,
        textLength: corpusItem.text.length,
        annotatorId: user.id,
        isMachine: false,
      });
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
        await addRegionTags(tx, {
          corpusItemId: task.corpusItemId,
          regions: regionsToWrite,
          textLength: corpusItem.text.length,
          annotatorId: user.id,
          isMachine: false,
        });
      }
      return completeTask(tx, taskId, user.id);
    });

    if (regionsToWrite && regionsToWrite.length > 0) {
      await this.refreshConsensusAndMaybeAdjudicate(task.corpusItemId, corpusItem.version, 'region', 0, corpusItem.text.length);
    }

    return completedTask;
  }

  async translate(user: RequestUser, taskId: string, dto: TranslateTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    const targetLang = TRANSLATE_TASK_LANGS[task.type];
    if (!targetLang) {
      throw new BadRequestException('This task is not a translation task');
    }

    const corpusItem = await this.prisma.corpusItem.findUniqueOrThrow({ where: { id: task.corpusItemId } });

    const [, completedTask] = await this.prisma.$transaction(async (tx) => {
      const created = await createTranslation(tx, {
        corpusItemId: task.corpusItemId,
        targetLang,
        text: dto.text,
        translatorId: user.id,
        isMachine: false,
      });
      const done = await completeTask(tx, taskId, user.id, created.id);
      return [created, done];
    });

    await spawnTasks(this.prisma, onTranslationAdded(task.corpusItemId, corpusItem.version, corpusItem.script));

    return completedTask;
  }

  async transliterate(user: RequestUser, taskId: string, dto: TransliterateTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    const script = TRANSLITERATE_TASK_SCRIPTS[task.type];
    if (!script) {
      throw new BadRequestException('This task is not a transliteration task');
    }

    const [, completedTask] = await this.prisma.$transaction(async (tx) => {
      const created = await createLexiconForm(tx, dto.lexiconVariantId, { text: dto.text, script, isMachine: false });
      if (!created) {
        throw new NotFoundException('Lexicon variant not found');
      }
      const done = await completeTask(tx, taskId, user.id, created.id);
      return [created, done];
    });

    return completedTask;
  }

  async standardise(user: RequestUser, taskId: string, dto: StandardiseTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    if (task.type !== 'standardise') {
      throw new BadRequestException('This task is not a standardise task');
    }

    const corpusItem = await this.prisma.corpusItem.findUniqueOrThrow({ where: { id: task.corpusItemId } });
    const tokenSpans = tokenize(corpusItem.text);
    const activeRules = await getActiveStandardisationRules(this.prisma, corpusItem.script);
    const ruleVersion = currentRuleVersion(activeRules);
    const canonicalMap = computeCanonicalMap(corpusItem.text, dto.canonicalForm, ruleVersion);

    const [updatedItem, completedTask] = await this.prisma.$transaction(async (tx) => {
      const item = await tx.corpusItem.update({
        where: { id: task.corpusItemId },
        data: {
          canonicalForm: dto.canonicalForm,
          canonicalMap: canonicalMap as unknown as Prisma.InputJsonValue,
          ruleVersion,
          version: { increment: 1 },
        },
      });
      for (const span of tokenSpans) {
        await addToken(tx, {
          corpusItemId: task.corpusItemId,
          charStart: span.charStart,
          charEnd: span.charEnd,
          surfaceText: span.surfaceText,
          annotatorId: user.id,
          isMachine: false,
        });
      }
      const done = await completeTask(tx, taskId, user.id);
      return [item, done];
    });

    await spawnTasks(this.prisma, onCorpusItemStandardised(task.corpusItemId, updatedItem.version, tokenSpans));

    return completedTask;
  }

  async linkLemma(user: RequestUser, taskId: string, dto: LinkLemmaTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    if (task.type !== 'link_lemma') {
      throw new BadRequestException('This task is not a link_lemma task');
    }

    const { charStart, charEnd } = parseSpanSlot(task.idempotencySlot);
    const token = await this.prisma.token.findFirst({
      where: { corpusItemId: task.corpusItemId, charStart, charEnd },
    });
    if (!token) {
      throw new NotFoundException('No token found at this task’s span — has this item been standardised?');
    }

    const [, completedTask] = await this.prisma.$transaction(async (tx) => {
      const created = await addLink(tx, {
        tokenId: token.id,
        lexiconEntryId: dto.lexiconEntryId,
        lexiconVariantId: dto.lexiconVariantId,
        annotatorId: user.id,
        isMachine: false,
      });
      const done = await completeTask(tx, taskId, user.id, created.id);
      return [created, done];
    });

    if (dto.lexiconVariantId) {
      const corpusItem = await this.prisma.corpusItem.findUnique({
        where: { id: task.corpusItemId },
        include: { tags: { where: { kind: 'region', charStart: 0 } } },
      });
      const regions = new Set((corpusItem?.tags ?? []).map((t) => t.value as Region));
      for (const region of regions) {
        await attestLexiconVariantRegion(this.prisma, dto.lexiconVariantId, region);
      }
    }

    return completedTask;
  }

  async adjudicate(user: RequestUser, taskId: string, dto: AdjudicateTaskDto): Promise<Task> {
    const task = await this.assertClaimedByUser(user, taskId);
    if (task.type !== 'adjudicate') {
      throw new BadRequestException('This task is not an adjudicate task');
    }

    const { charStart, charEnd } = parseSpanSlot(task.idempotencySlot);

    const completedTask = await this.prisma.$transaction(async (tx) => {
      for (const value of dto.values) {
        await addTag(tx, {
          corpusItemId: task.corpusItemId,
          kind: dto.kind,
          value,
          charStart,
          charEnd,
          annotatorId: user.id,
          isMachine: false,
        });
      }
      return completeTask(tx, taskId, user.id);
    });

    await refreshConsensus(this.prisma, { corpusItemId: task.corpusItemId, kind: dto.kind, charStart, charEnd });

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
