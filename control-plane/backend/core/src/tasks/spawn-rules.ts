import type { Region, Script, TaskType } from '@open-derja/db';
import { emptySlot, ordinalSlot, spanSlot } from './idem-key';
import type { TaskSpec } from './spawn';

export function onCorpusItemIngested(corpusItemId: string, itemVersion: number): TaskSpec[] {
  return [{ corpusItemId, itemVersion, type: 'review', slot: emptySlot, requiresRole: 'reviewer' }];
}

export function onReviewApproved(corpusItemId: string, itemVersion: number): TaskSpec[] {
  return [
    { corpusItemId, itemVersion, type: 'region_tag', slot: emptySlot, requiresRole: 'contributor' },
    { corpusItemId, itemVersion, type: 'translate_msa', slot: emptySlot, requiresRole: 'contributor' },
    { corpusItemId, itemVersion, type: 'standardise', slot: emptySlot, requiresRole: 'reviewer' },
  ];
}

export function onRegionTagDone(corpusItemId: string, itemVersion: number): TaskSpec[] {
  return [
    { corpusItemId, itemVersion, type: 'confirm', slot: ordinalSlot(1), requiresRole: 'contributor' },
    { corpusItemId, itemVersion, type: 'confirm', slot: ordinalSlot(2), requiresRole: 'contributor' },
  ];
}

export function onTranslationAdded(corpusItemId: string, itemVersion: number, script: Script): TaskSpec[] {
  if (script === 'arabizi') {
    return [{ corpusItemId, itemVersion, type: 'transliterate_to_arabic', slot: emptySlot, requiresRole: 'contributor' }];
  }
  if (script === 'arabic') {
    return [{ corpusItemId, itemVersion, type: 'transliterate_to_arabizi', slot: emptySlot, requiresRole: 'contributor' }];
  }
  return [];
}

export function onConsensusLowAgreement(
  corpusItemId: string,
  itemVersion: number,
  charStart: number,
  charEnd: number,
  targetRegions: Region[],
): TaskSpec[] {
  return [
    {
      corpusItemId,
      itemVersion,
      type: 'adjudicate',
      slot: spanSlot(charStart, charEnd),
      requiresRole: 'reviewer',
      targetRegions,
    },
  ];
}

export function onCorpusItemStandardised(
  corpusItemId: string,
  itemVersion: number,
  tokenSpans: Array<{ charStart: number; charEnd: number }>,
): TaskSpec[] {
  return tokenSpans.map((span) => ({
    corpusItemId,
    itemVersion,
    type: 'link_lemma' as const,
    slot: spanSlot(span.charStart, span.charEnd),
    requiresRole: 'reviewer' as const,
  }));
}

export type CorpusItemChangeKind = 'standardisation' | 'region_retag' | 'translation' | 'lemma_link';

const TASKS_INVALIDATED_BY_CHANGE: Record<CorpusItemChangeKind, TaskType[]> = {
  standardisation: ['link_lemma'],
  region_retag: [],
  translation: [],
  lemma_link: [],
};

export function tasksInvalidatedBy(change: CorpusItemChangeKind): TaskType[] {
  return TASKS_INVALIDATED_BY_CHANGE[change];
}
