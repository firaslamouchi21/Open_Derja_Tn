import type { CorpusUnit } from '@open-derja/db';

const SENTENCE_TERMINALS = /[.!?؟]/g;

export function detectUnit(text: string): CorpusUnit {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const terminals = trimmed.match(SENTENCE_TERMINALS)?.length ?? 0;

  if (words.length <= 3 && terminals === 0) return 'phrase';
  if (terminals <= 1) return 'sentence';
  return 'paragraph';
}
