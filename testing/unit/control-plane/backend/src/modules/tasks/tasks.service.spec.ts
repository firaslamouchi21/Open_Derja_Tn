import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as core from '@open-derja/core';
import { TasksService } from '../../../../../../../control-plane/backend/src/modules/tasks/tasks.service';
import type { RequestUser } from '../../../../../../../control-plane/backend/src/common/guards/request-user.interface';

jest.mock(
  '@open-derja/core',
  () => ({
    addFullSpanTag: jest.fn(),
    addLink: jest.fn(),
    addRegionTags: jest.fn(),
    addTag: jest.fn(),
    addToken: jest.fn(),
    claimNextTask: jest.fn(),
    completeTask: jest.fn(),
    computeCanonicalMap: jest.fn(),
    createLexiconForm: jest.fn(),
    createTranslation: jest.fn(),
    currentRuleVersion: jest.fn(),
    attestLexiconVariantRegion: jest.fn(),
    getActiveStandardisationRules: jest.fn(),
    getClaimableTaskRole: jest.fn(),
    getEligibleTaskTypes: jest.fn(),
    onConsensusLowAgreement: jest.fn(),
    onCorpusItemStandardised: jest.fn(),
    onRegionTagDone: jest.fn(),
    onReviewApproved: jest.fn(),
    onTranslationAdded: jest.fn(),
    parseSpanSlot: jest.fn(),
    refreshConsensus: jest.fn(),
    rejectTask: jest.fn(),
    requestRework: jest.fn(),
    spawnTasks: jest.fn(),
    tokenize: jest.fn(),
  }),
  { virtual: true },
);

const mockedCore = core as jest.Mocked<typeof core>;

const USER: RequestUser = { id: 'user-1', role: 'reviewer', trustLevel: 3, emailConfirmed: true };

function makePrisma() {
  const prisma: any = {
    task: { findUnique: jest.fn() },
    corpusItem: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tag: { findMany: jest.fn() },
    token: { findFirst: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  };
  return prisma;
}

function makeSettings(paused: string[] = []) {
  return { get: jest.fn().mockResolvedValue(paused), getPausedTaskTypes: jest.fn().mockResolvedValue(paused) };
}

function mkTasks(prisma: unknown, settings: unknown = makeSettings()) {
  return new TasksService(prisma as never, settings as never);
}

function claimedTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    type: 'review',
    status: 'claimed',
    claimedBy: USER.id,
    corpusItemId: 'item-1',
    idempotencySlot: '',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TasksService claim', () => {
  it('resolves eligible types and claimable role, then delegates to claimNextTask', async () => {
    const prisma = makePrisma();
    mockedCore.getEligibleTaskTypes.mockReturnValue(['confirm', 'region_tag'] as any);
    mockedCore.getClaimableTaskRole.mockReturnValue('contributor' as any);
    mockedCore.claimNextTask.mockResolvedValue({ id: 'task-9' } as any);

    const service = mkTasks(prisma);
    const result = await service.claim(USER);

    expect(mockedCore.getEligibleTaskTypes).toHaveBeenCalledWith(USER);
    expect(mockedCore.getClaimableTaskRole).toHaveBeenCalledWith(USER.role);
    expect(mockedCore.claimNextTask).toHaveBeenCalledWith(prisma, {
      userId: USER.id,
      role: 'contributor',
      types: ['confirm', 'region_tag'],
      excludeTypes: [],
    });
    expect(result).toEqual({ id: 'task-9' });
  });

  it('passes paused task types through as excludeTypes so a paused type is never claimed', async () => {
    const prisma = makePrisma();
    mockedCore.getEligibleTaskTypes.mockReturnValue(['confirm', 'region_tag'] as any);
    mockedCore.getClaimableTaskRole.mockReturnValue('contributor' as any);
    mockedCore.claimNextTask.mockResolvedValue(undefined as any);

    const service = mkTasks(prisma, makeSettings(['region_tag']));
    await service.claim(USER);

    expect(mockedCore.claimNextTask).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ excludeTypes: ['region_tag'] }),
    );
  });
});

describe('TasksService claim guard (assertClaimedByUser / assertExists)', () => {
  it('throws NotFoundException when the task does not exist', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(null);
    const service = mkTasks(prisma);

    await expect(service.complete(USER, 'ghost-task')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the task is not claimed by this user', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ claimedBy: 'someone-else' }));
    const service = mkTasks(prisma);

    await expect(service.complete(USER, 'task-1')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the task is not in claimed status', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ status: 'open' }));
    const service = mkTasks(prisma);

    await expect(service.complete(USER, 'task-1')).rejects.toThrow(ForbiddenException);
  });

  it('completes a validly claimed task', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask());
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1', status: 'done' } as any);
    const service = mkTasks(prisma);

    const result = await service.complete(USER, 'task-1', 'record-1');

    expect(mockedCore.completeTask).toHaveBeenCalledWith(prisma, 'task-1', USER.id, 'record-1');
    expect(result).toEqual({ id: 'task-1', status: 'done' });
  });
});

describe('TasksService.review', () => {
  it('rejects when the claimed task is not a review task', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'confirm' }));
    const service = mkTasks(prisma);

    await expect(service.review(USER, 'task-1', { approved: true } as any)).rejects.toThrow(BadRequestException);
  });

  it('rejects the task outright and skips the transaction when not approved', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask());
    mockedCore.rejectTask.mockResolvedValue({ id: 'task-1', status: 'rejected' } as any);
    const service = mkTasks(prisma);

    const result = await service.review(USER, 'task-1', { approved: false } as any);

    expect(mockedCore.rejectTask).toHaveBeenCalledWith(prisma, 'task-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'task-1', status: 'rejected' });
  });

  it('writes quality and region tags, completes the task, spawns follow-ups, and refreshes consensus for each axis touched', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask());
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'hello world', version: 3 });
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1', status: 'done' } as any);
    mockedCore.onReviewApproved.mockReturnValue(['spec-1'] as any);
    mockedCore.refreshConsensus.mockResolvedValue({ needsAdjudication: false, allValues: [] } as any);

    const service = mkTasks(prisma);
    const dto = { approved: true, qualityValue: 'high', regions: ['sahel', 'north'] } as any;
    const result = await service.review(USER, 'task-1', dto);

    expect(mockedCore.addFullSpanTag).toHaveBeenCalledWith(prisma, expect.objectContaining({ kind: 'quality', value: 'high' }));
    expect(mockedCore.addRegionTags).toHaveBeenCalledWith(prisma, expect.objectContaining({ regions: ['sahel', 'north'] }));
    expect(mockedCore.completeTask).toHaveBeenCalledWith(prisma, 'task-1', USER.id);
    expect(mockedCore.spawnTasks).toHaveBeenCalledWith(prisma, ['spec-1']);
    expect(mockedCore.onReviewApproved).toHaveBeenCalledWith('item-1', 3);
    expect(mockedCore.refreshConsensus).toHaveBeenCalledTimes(2);
    expect(mockedCore.refreshConsensus).toHaveBeenCalledWith(prisma, { corpusItemId: 'item-1', kind: 'quality', charStart: 0, charEnd: 11 });
    expect(mockedCore.refreshConsensus).toHaveBeenCalledWith(prisma, { corpusItemId: 'item-1', kind: 'region', charStart: 0, charEnd: 11 });
    expect(result).toEqual({ id: 'task-1', status: 'done' });
  });

  it('skips tag writes and consensus refresh entirely when neither qualityValue nor regions are given', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask());
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'hi', version: 1 });
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1', status: 'done' } as any);
    mockedCore.onReviewApproved.mockReturnValue([] as any);

    const service = mkTasks(prisma);
    await service.review(USER, 'task-1', { approved: true } as any);

    expect(mockedCore.addFullSpanTag).not.toHaveBeenCalled();
    expect(mockedCore.addRegionTags).not.toHaveBeenCalled();
    expect(mockedCore.refreshConsensus).not.toHaveBeenCalled();
  });

  it('spawns an adjudication task when consensus refresh reports low agreement on regions', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask());
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'hi there', version: 2 });
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);
    mockedCore.onReviewApproved.mockReturnValue([] as any);
    mockedCore.refreshConsensus.mockResolvedValue({ needsAdjudication: true, allValues: ['sahel', 'north'] } as any);
    mockedCore.onConsensusLowAgreement.mockReturnValue(['adjudicate-spec'] as any);

    const service = mkTasks(prisma);
    await service.review(USER, 'task-1', { approved: true, regions: ['sahel', 'north'] } as any);

    expect(mockedCore.onConsensusLowAgreement).toHaveBeenCalledWith('item-1', 2, 0, 8, ['sahel', 'north']);
    expect(mockedCore.spawnTasks).toHaveBeenCalledWith(prisma, ['adjudicate-spec']);
  });
});

describe('TasksService.confirm', () => {
  it('re-attests the region tags already present when the contributor agrees', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'confirm' }));
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'hi there', version: 1 });
    prisma.tag.findMany.mockResolvedValue([{ value: 'sahel' }, { value: 'north' }]);
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);
    mockedCore.refreshConsensus.mockResolvedValue({ needsAdjudication: false, allValues: [] } as any);

    const service = mkTasks(prisma);
    await service.confirm(USER, 'task-1', { agrees: true } as any);

    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ corpusItemId: 'item-1', kind: 'region' }) }),
    );
    expect(mockedCore.addRegionTags).toHaveBeenCalledWith(prisma, expect.objectContaining({ regions: ['sahel', 'north'] }));
  });

  it('writes the contributor-supplied regions when they disagree', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'confirm' }));
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'hi there', version: 1 });
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);
    mockedCore.refreshConsensus.mockResolvedValue({ needsAdjudication: false, allValues: [] } as any);

    const service = mkTasks(prisma);
    await service.confirm(USER, 'task-1', { agrees: false, regions: ['south'] } as any);

    expect(prisma.tag.findMany).not.toHaveBeenCalled();
    expect(mockedCore.addRegionTags).toHaveBeenCalledWith(prisma, expect.objectContaining({ regions: ['south'] }));
  });

  it('skips region writes and consensus refresh when agreeing with no existing region tags', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'confirm' }));
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'hi', version: 1 });
    prisma.tag.findMany.mockResolvedValue([]);
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);

    const service = mkTasks(prisma);
    await service.confirm(USER, 'task-1', { agrees: true } as any);

    expect(mockedCore.addRegionTags).not.toHaveBeenCalled();
    expect(mockedCore.refreshConsensus).not.toHaveBeenCalled();
  });
});

describe('TasksService.standardise', () => {
  it('computes the canonical map from active rules and persists tokens against it', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'standardise' }));
    prisma.corpusItem.findUniqueOrThrow.mockResolvedValue({ id: 'item-1', text: 'chnowa', script: 'latin' });
    prisma.corpusItem.update.mockResolvedValue({ id: 'item-1', version: 2 });
    mockedCore.tokenize.mockReturnValue([{ charStart: 0, charEnd: 6, surfaceText: 'chnowa' }] as any);
    mockedCore.getActiveStandardisationRules.mockResolvedValue([{ ruleVersion: 3 }] as any);
    mockedCore.currentRuleVersion.mockReturnValue(3);
    mockedCore.computeCanonicalMap.mockReturnValue({ ruleVersion: 3, segments: [] } as any);
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1', status: 'done' } as any);
    mockedCore.onCorpusItemStandardised.mockReturnValue(['link-spec'] as any);

    const service = mkTasks(prisma);
    const result = await service.standardise(USER, 'task-1', { canonicalForm: 'شنوة' } as any);

    expect(mockedCore.computeCanonicalMap).toHaveBeenCalledWith('chnowa', 'شنوة', 3);
    expect(prisma.corpusItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        canonicalForm: 'شنوة',
        canonicalMap: { ruleVersion: 3, segments: [] },
        ruleVersion: 3,
        version: { increment: 1 },
      },
    });
    expect(mockedCore.addToken).toHaveBeenCalledWith(prisma, expect.objectContaining({ charStart: 0, charEnd: 6, surfaceText: 'chnowa' }));
    expect(mockedCore.onCorpusItemStandardised).toHaveBeenCalledWith('item-1', 2, [{ charStart: 0, charEnd: 6, surfaceText: 'chnowa' }]);
    expect(result).toEqual({ id: 'task-1', status: 'done' });
  });
});

describe('TasksService.linkLemma', () => {
  it('throws NotFoundException when no token exists at the task span', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'link_lemma', idempotencySlot: '0:5' }));
    mockedCore.parseSpanSlot.mockReturnValue({ charStart: 0, charEnd: 5 });
    prisma.token.findFirst.mockResolvedValue(null);

    const service = mkTasks(prisma);
    await expect(service.linkLemma(USER, 'task-1', { lexiconEntryId: 'entry-1' } as any)).rejects.toThrow(NotFoundException);
  });

  it('attests every distinct region already tagged on the item once a variant is linked', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'link_lemma', idempotencySlot: '0:5' }));
    mockedCore.parseSpanSlot.mockReturnValue({ charStart: 0, charEnd: 5 });
    prisma.token.findFirst.mockResolvedValue({ id: 'token-1' });
    mockedCore.addLink.mockResolvedValue({ id: 'link-1' } as any);
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);
    prisma.corpusItem.findUnique.mockResolvedValue({
      tags: [{ value: 'sahel' }, { value: 'sahel' }, { value: 'north' }],
    });

    const service = mkTasks(prisma);
    await service.linkLemma(USER, 'task-1', { lexiconEntryId: 'entry-1', lexiconVariantId: 'variant-1' } as any);

    expect(mockedCore.attestLexiconVariantRegion).toHaveBeenCalledTimes(2);
    expect(mockedCore.attestLexiconVariantRegion).toHaveBeenCalledWith(prisma, 'variant-1', 'sahel');
    expect(mockedCore.attestLexiconVariantRegion).toHaveBeenCalledWith(prisma, 'variant-1', 'north');
  });

  it('skips region attestation entirely when no lexicon variant is linked', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'link_lemma', idempotencySlot: '0:5' }));
    mockedCore.parseSpanSlot.mockReturnValue({ charStart: 0, charEnd: 5 });
    prisma.token.findFirst.mockResolvedValue({ id: 'token-1' });
    mockedCore.addLink.mockResolvedValue({ id: 'link-1' } as any);
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);

    const service = mkTasks(prisma);
    await service.linkLemma(USER, 'task-1', { lexiconEntryId: 'entry-1' } as any);

    expect(prisma.corpusItem.findUnique).not.toHaveBeenCalled();
    expect(mockedCore.attestLexiconVariantRegion).not.toHaveBeenCalled();
  });
});

describe('TasksService.adjudicate', () => {
  it('writes one tag per submitted value at the task span, then refreshes consensus', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'adjudicate', idempotencySlot: '2:9' }));
    mockedCore.parseSpanSlot.mockReturnValue({ charStart: 2, charEnd: 9 });
    mockedCore.completeTask.mockResolvedValue({ id: 'task-1' } as any);

    const service = mkTasks(prisma);
    await service.adjudicate(USER, 'task-1', { kind: 'region', values: ['sahel', 'north'] } as any);

    expect(mockedCore.addTag).toHaveBeenCalledTimes(2);
    expect(mockedCore.addTag).toHaveBeenCalledWith(prisma, expect.objectContaining({ kind: 'region', value: 'sahel', charStart: 2, charEnd: 9 }));
    expect(mockedCore.addTag).toHaveBeenCalledWith(prisma, expect.objectContaining({ kind: 'region', value: 'north', charStart: 2, charEnd: 9 }));
    expect(mockedCore.refreshConsensus).toHaveBeenCalledWith(prisma, { corpusItemId: 'item-1', kind: 'region', charStart: 2, charEnd: 9 });
  });
});

describe('TasksService.translate / transliterate task-type guards', () => {
  it('rejects translate() when the claimed task is not a translation task', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'confirm' }));
    const service = mkTasks(prisma);

    await expect(service.translate(USER, 'task-1', { text: 'x' } as any)).rejects.toThrow(BadRequestException);
  });

  it('rejects transliterate() when the claimed task is not a transliteration task', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'confirm' }));
    const service = mkTasks(prisma);

    await expect(service.transliterate(USER, 'task-1', { text: 'x' } as any)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException from transliterate() when the target lexicon variant no longer exists', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValue(claimedTask({ type: 'transliterate_to_arabic' }));
    mockedCore.createLexiconForm.mockResolvedValue(null as any);

    const service = mkTasks(prisma);
    await expect(
      service.transliterate(USER, 'task-1', { lexiconVariantId: 'ghost', text: 'x' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('TasksService.rework / reject', () => {
  it('rework() throws NotFoundException for a missing task and otherwise delegates to requestRework', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValueOnce(null);
    const service = mkTasks(prisma);
    await expect(service.rework('ghost')).rejects.toThrow(NotFoundException);

    prisma.task.findUnique.mockResolvedValueOnce(claimedTask());
    mockedCore.requestRework.mockResolvedValue({ id: 'task-1', status: 'needs_rework' } as any);
    const result = await service.rework('task-1');
    expect(mockedCore.requestRework).toHaveBeenCalledWith(prisma, 'task-1');
    expect(result).toEqual({ id: 'task-1', status: 'needs_rework' });
  });

  it('reject() throws NotFoundException for a missing task and otherwise delegates to rejectTask', async () => {
    const prisma = makePrisma();
    prisma.task.findUnique.mockResolvedValueOnce(null);
    const service = mkTasks(prisma);
    await expect(service.reject('ghost')).rejects.toThrow(NotFoundException);

    prisma.task.findUnique.mockResolvedValueOnce(claimedTask());
    mockedCore.rejectTask.mockResolvedValue({ id: 'task-1', status: 'rejected' } as any);
    const result = await service.reject('task-1');
    expect(mockedCore.rejectTask).toHaveBeenCalledWith(prisma, 'task-1');
    expect(result).toEqual({ id: 'task-1', status: 'rejected' });
  });
});
