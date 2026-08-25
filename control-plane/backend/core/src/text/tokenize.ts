export interface TokenSpan {
  charStart: number;
  charEnd: number;
  surfaceText: string;
}

const WORD_RE = /[\p{L}\p{M}\p{N}]+/gu;

export function tokenize(text: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  for (const match of text.matchAll(WORD_RE)) {
    const charStart = match.index ?? 0;
    spans.push({ charStart, charEnd: charStart + match[0].length, surfaceText: match[0] });
  }
  return spans;
}
