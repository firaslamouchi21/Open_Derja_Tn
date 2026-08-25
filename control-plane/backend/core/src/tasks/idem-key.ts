import { createHash } from 'node:crypto';
import type { TaskType } from '@open-derja/db';

export function computeIdemKey(corpusItemId: string, type: TaskType, itemVersion: number, slot: string): string {
  return createHash('sha256').update(`${corpusItemId}:${type}:${itemVersion}:${slot}`).digest('hex');
}

export function spanSlot(charStart: number, charEnd: number): string {
  return `${charStart}:${charEnd}`;
}

export function parseSpanSlot(slot: string): { charStart: number; charEnd: number } {
  const [charStart, charEnd] = slot.split(':').map(Number);
  return { charStart, charEnd };
}

export function ordinalSlot(n: number): string {
  return String(n);
}

export const emptySlot = '';
