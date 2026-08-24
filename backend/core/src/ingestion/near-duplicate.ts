const SHINGLE_SIZE = 3;
const HASH_FUNCTION_COUNT = 64;
const HASH_MULTIPLIER = 2654435761;
const HASH_SEEDS = Array.from({ length: HASH_FUNCTION_COUNT }, (_, i) => (i + 1) * HASH_MULTIPLIER);

export const NEAR_DUPLICATE_THRESHOLD = 0.85;

function shingle(text: string): Set<string> {
  const normalised = text.replace(/\s+/g, ' ').trim();
  if (normalised.length < SHINGLE_SIZE) {
    return new Set([normalised]);
  }

  const shingles = new Set<string>();
  for (let i = 0; i <= normalised.length - SHINGLE_SIZE; i++) {
    shingles.add(normalised.slice(i, i + SHINGLE_SIZE));
  }
  return shingles;
}

function hash32(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), HASH_MULTIPLIER);
    hash ^= hash >>> 15;
  }
  return hash >>> 0;
}

export function computeMinHashSignature(text: string): number[] {
  const shingles = shingle(text);
  const signature = new Array<number>(HASH_FUNCTION_COUNT).fill(Number.POSITIVE_INFINITY);

  for (const s of shingles) {
    for (let i = 0; i < HASH_FUNCTION_COUNT; i++) {
      const hashed = hash32(s, HASH_SEEDS[i]);
      if (hashed < signature[i]) signature[i] = hashed;
    }
  }
  return signature;
}

export function estimateJaccardSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) matches += 1;
  }
  return matches / a.length;
}
