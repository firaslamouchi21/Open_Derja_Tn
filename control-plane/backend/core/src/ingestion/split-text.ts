const PARAGRAPH_SPLIT_PATTERN = /\n\s*\n+/;
const SENTENCE_END_PATTERN = /(?<=[.!?؟])\s+(?=\S)/u;

export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(PARAGRAPH_SPLIT_PATTERN)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function splitIntoSentences(text: string): string[] {
  return text
    .split(SENTENCE_END_PATTERN)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
