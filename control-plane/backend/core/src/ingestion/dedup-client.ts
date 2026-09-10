import { computeMinHashSignature, estimateJaccardSimilarity, NEAR_DUPLICATE_THRESHOLD } from './near-duplicate';

export interface DedupCandidate {
  id: string;
  text: string;
}

export interface DedupMatch {
  id: string;
  similarity: number;
}

export interface DedupCheckResult {
  isNearDuplicate: boolean;
  matches: DedupMatch[];
}

interface DataPlaneDedupResponse {
  is_near_duplicate: boolean;
  matches: Array<{ id: string; similarity: number }>;
}

function checkNearDuplicatesLocally(text: string, candidates: DedupCandidate[]): DedupCheckResult {
  const signature = computeMinHashSignature(text);
  const matches = candidates
    .map((candidate) => ({
      id: candidate.id,
      similarity: estimateJaccardSimilarity(signature, computeMinHashSignature(candidate.text)),
    }))
    .filter((match) => match.similarity >= NEAR_DUPLICATE_THRESHOLD);

  return { isNearDuplicate: matches.length > 0, matches };
}

export async function checkNearDuplicates(
  text: string,
  candidates: DedupCandidate[],
  dataPlaneUrl: string | undefined,
): Promise<DedupCheckResult> {
  if (candidates.length === 0) return { isNearDuplicate: false, matches: [] };
  if (!dataPlaneUrl) return checkNearDuplicatesLocally(text, candidates);

  try {
    const response = await fetch(`${dataPlaneUrl}/dedup/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, candidates }),
    });
    if (!response.ok) return checkNearDuplicatesLocally(text, candidates);

    const body = (await response.json()) as DataPlaneDedupResponse;
    return {
      isNearDuplicate: body.is_near_duplicate,
      matches: body.matches.map((match) => ({ id: match.id, similarity: match.similarity })),
    };
  } catch {
    return checkNearDuplicatesLocally(text, candidates);
  }
}
