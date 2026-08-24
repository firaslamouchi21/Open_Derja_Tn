const ALEF_VARIANTS = /[أإآٱ]/g;
const TAA_MARBUTA = /ة/g;
const ALEF_MAQSURA = /ى/g;
const DIACRITICS = /[ً-ْٰ]/g;
const TATWEEL = /ـ/g;
const ARABIC_INDIC_DIGITS = /[٠-٩]/g;

const ARABIC_INDIC_TO_LATIN: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export function computeMatchKey(text: string): string {
  return text
    .replace(ALEF_VARIANTS, 'ا')
    .replace(TAA_MARBUTA, 'ه')
    .replace(ALEF_MAQSURA, 'ي')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(ARABIC_INDIC_DIGITS, (digit) => ARABIC_INDIC_TO_LATIN[digit] ?? digit)
    .trim()
    .toLowerCase();
}
