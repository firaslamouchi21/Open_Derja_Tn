import { splitIntoParagraphs, splitIntoSentences } from '../../../../../../control-plane/backend/core/src/ingestion/split-text';

describe('splitIntoParagraphs', () => {
  it('splits on blank lines', () => {
    expect(splitIntoParagraphs('first\n\nsecond\n\n\nthird')).toEqual(['first', 'second', 'third']);
  });

  it('trims each paragraph and drops empty ones', () => {
    expect(splitIntoParagraphs('  first  \n\n   \n\n  second  ')).toEqual(['first', 'second']);
  });

  it('returns the whole text as one paragraph when there are no blank lines', () => {
    expect(splitIntoParagraphs('just one paragraph')).toEqual(['just one paragraph']);
  });
});

describe('splitIntoSentences', () => {
  it('splits on sentence-terminal punctuation followed by whitespace', () => {
    expect(splitIntoSentences('Aya labes. Chnowa hwelek?')).toEqual(['Aya labes.', 'Chnowa hwelek?']);
  });

  it('splits on the Arabic question mark', () => {
    expect(splitIntoSentences('شنوة حالك؟ لاباس')).toEqual(['شنوة حالك؟', 'لاباس']);
  });

  it('does not split on terminal punctuation with no trailing content', () => {
    expect(splitIntoSentences('one sentence.')).toEqual(['one sentence.']);
  });
});
