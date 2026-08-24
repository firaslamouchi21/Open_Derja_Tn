import type { DatasetSplit } from '@open-derja/db';

const SPLIT_WEIGHTS: Array<[DatasetSplit, number]> = [
  ['train', 0.8],
  ['dev', 0.1],
  ['test', 0.1],
];

export function assignDatasetSplit(random: () => number = Math.random): DatasetSplit {
  const roll = random();
  let cumulative = 0;
  for (const [split, weight] of SPLIT_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return split;
  }
  return 'train';
}
