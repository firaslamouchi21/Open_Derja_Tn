export interface CanonicalMapSegment {
  originalStart: number;
  originalEnd: number;
  canonicalStart: number;
  canonicalEnd: number;
}

export interface CanonicalMap {
  ruleVersion: number;
  segments: CanonicalMapSegment[];
}

export function computeCanonicalMap(original: string, canonical: string, ruleVersion: number): CanonicalMap {
  const matches = longestCommonSubsequenceMatches(original, canonical);

  const segments: CanonicalMapSegment[] = [];
  let originalCursor = 0;
  let canonicalCursor = 0;
  let k = 0;

  while (k < matches.length) {
    const runStart = matches[k];
    let runEnd = runStart;
    while (
      k + 1 < matches.length &&
      matches[k + 1].originalIndex === matches[k].originalIndex + 1 &&
      matches[k + 1].canonicalIndex === matches[k].canonicalIndex + 1
    ) {
      k++;
      runEnd = matches[k];
    }

    if (runStart.originalIndex > originalCursor || runStart.canonicalIndex > canonicalCursor) {
      segments.push({
        originalStart: originalCursor,
        originalEnd: runStart.originalIndex,
        canonicalStart: canonicalCursor,
        canonicalEnd: runStart.canonicalIndex,
      });
    }
    segments.push({
      originalStart: runStart.originalIndex,
      originalEnd: runEnd.originalIndex + 1,
      canonicalStart: runStart.canonicalIndex,
      canonicalEnd: runEnd.canonicalIndex + 1,
    });
    originalCursor = runEnd.originalIndex + 1;
    canonicalCursor = runEnd.canonicalIndex + 1;
    k++;
  }

  if (originalCursor < original.length || canonicalCursor < canonical.length) {
    segments.push({
      originalStart: originalCursor,
      originalEnd: original.length,
      canonicalStart: canonicalCursor,
      canonicalEnd: canonical.length,
    });
  }

  return { ruleVersion, segments };
}

export function projectSpanOntoCanonical(
  map: CanonicalMap,
  charStart: number,
  charEnd: number,
): { charStart: number; charEnd: number } | undefined {
  const overlapping = map.segments.filter((s) => s.originalEnd > charStart && s.originalStart < charEnd);
  if (overlapping.length === 0) {
    return undefined;
  }
  const first = overlapping[0];
  const last = overlapping[overlapping.length - 1];
  return {
    charStart: interpolate(first, charStart, 'canonicalStart'),
    charEnd: interpolate(last, charEnd, 'canonicalEnd'),
  };
}

function interpolate(segment: CanonicalMapSegment, originalOffset: number, bound: 'canonicalStart' | 'canonicalEnd'): number {
  const originalLength = segment.originalEnd - segment.originalStart;
  if (originalLength <= 0) {
    return segment[bound];
  }
  const canonicalLength = segment.canonicalEnd - segment.canonicalStart;
  const ratio = Math.min(1, Math.max(0, (originalOffset - segment.originalStart) / originalLength));
  return Math.round(segment.canonicalStart + ratio * canonicalLength);
}

interface CharMatch {
  originalIndex: number;
  canonicalIndex: number;
}

function longestCommonSubsequenceMatches(original: string, canonical: string): CharMatch[] {
  const n = original.length;
  const m = canonical.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        original[i - 1] === canonical[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matches: CharMatch[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (original[i - 1] === canonical[j - 1]) {
      matches.push({ originalIndex: i - 1, canonicalIndex: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return matches.reverse();
}
