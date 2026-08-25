const WORD_SPLIT_PATTERN = /[\s.,!?؟،؛:;"'«»()[\]{}]+/u;

export function matchesAnyMarker(text: string, markers: string[]): boolean {
  if (markers.length === 0) return true;

  const words = new Set(
    text
      .split(WORD_SPLIT_PATTERN)
      .filter(Boolean)
      .map((word) => word.toLowerCase()),
  );
  return markers.some((marker) => words.has(marker.toLowerCase()));
}
