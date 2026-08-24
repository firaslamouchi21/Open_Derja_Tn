export const CONSENSUS_THRESHOLD = 0.6;

export interface ConsensusResult {
  agreedValues: string[];
  allValues: string[];
  agreement: number;
  annotatorN: number;
  needsAdjudication: boolean;
}

export function computeAgreement(annotatorValues: Map<string, Set<string>>): ConsensusResult {
  const sets = [...annotatorValues.values()];
  const annotatorN = sets.length;

  if (annotatorN === 0) {
    return { agreedValues: [], allValues: [], agreement: 1, annotatorN: 0, needsAdjudication: false };
  }

  const allValues = [...new Set(sets.flatMap((set) => [...set]))];

  if (annotatorN === 1) {
    return { agreedValues: [...sets[0]], allValues, agreement: 1, annotatorN: 1, needsAdjudication: false };
  }

  const agreedValues = allValues.filter((value) => sets.every((set) => set.has(value)));

  let totalSimilarity = 0;
  let pairCount = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      totalSimilarity += jaccard(sets[i], sets[j]);
      pairCount += 1;
    }
  }
  const agreement = round2(totalSimilarity / pairCount);

  return {
    agreedValues,
    allValues,
    agreement,
    annotatorN,
    needsAdjudication: agreement < CONSENSUS_THRESHOLD,
  };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) {
    return 1;
  }
  let intersectionSize = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersectionSize += 1;
    }
  }
  return intersectionSize / union.size;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
