const URL_PATTERN = /https?:\/\/\S+/g;
const MENTION_PATTERN = /(?<=^|\s)@\w+/g;
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const HORIZONTAL_WHITESPACE_PATTERN = /[^\S\n]+/g;
const EXCESS_BLANK_LINES_PATTERN = /\n{3,}/g;

export function cleanText(raw: string): string {
  return raw
    .replace(URL_PATTERN, ' ')
    .replace(MENTION_PATTERN, ' ')
    .replace(EMOJI_PATTERN, ' ')
    .replace(HORIZONTAL_WHITESPACE_PATTERN, ' ')
    .replace(EXCESS_BLANK_LINES_PATTERN, '\n\n')
    .trim();
}
