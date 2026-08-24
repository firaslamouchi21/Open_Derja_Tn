const MIN_TOKENS = 3;
const MAX_TOKENS = 500;

export function isWithinLengthBounds(text: string): boolean {
  const tokenCount = text.trim().split(/\s+/).filter(Boolean).length;
  return tokenCount >= MIN_TOKENS && tokenCount <= MAX_TOKENS;
}
