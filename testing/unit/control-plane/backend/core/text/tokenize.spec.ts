import { tokenize } from '../../../../../../control-plane/backend/core/src/text/tokenize';

describe('tokenize', () => {
  it('splits on whitespace and punctuation, keeping offsets', () => {
    const spans = tokenize('lil, chnowa?');
    expect(spans).toEqual([
      { charStart: 0, charEnd: 3, surfaceText: 'lil' },
      { charStart: 5, charEnd: 11, surfaceText: 'chnowa' },
    ]);
  });

  it('returns an empty array for text with no word characters', () => {
    expect(tokenize('   ...  ')).toEqual([]);
  });

  it('treats combining marks and digits as part of a word', () => {
    const spans = tokenize('عندي3 كتب');
    expect(spans.map((s) => s.surfaceText)).toEqual(['عندي3', 'كتب']);
  });
});
