import type { Script } from '@open-derja/db';

const ARABIC_RANGE = /[؀-ۿݐ-ݿ]/;
const LATIN_RANGE = /[A-Za-z]/;

export function detectScript(text: string): Script {
  const hasArabic = ARABIC_RANGE.test(text);
  const hasLatin = LATIN_RANGE.test(text);

  if (hasArabic && hasLatin) return 'mixed';
  if (hasArabic) return 'arabic';
  return 'latin';
}
