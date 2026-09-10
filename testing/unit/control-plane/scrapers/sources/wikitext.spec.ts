import { stripWikitext } from '../../../../../control-plane/scrapers/src/sources/wikitext';

describe('stripWikitext', () => {
  it('removes balanced templates, including nested ones', () => {
    expect(stripWikitext('Hello {{cite|title={{nested}}}} world')).toBe('Hello  world');
  });

  it('converts a piped wiki link to its display text', () => {
    expect(stripWikitext('See [[Tunisia|Tunis]] for more')).toBe('See Tunis for more');
  });

  it('converts a bare wiki link to its target text', () => {
    expect(stripWikitext('See [[Tunisia]] for more')).toBe('See Tunisia for more');
  });

  it('drops category, file, and image links entirely', () => {
    expect(stripWikitext('Text [[Category:Places]] more [[File:pic.jpg|thumb]] end')).toBe('Text  more  end');
  });

  it('converts an external link with display text and drops a bare one', () => {
    expect(stripWikitext('Visit [https://example.com the site] or [https://example.com]')).toBe('Visit the site or');
  });

  it('strips bold and italic markup', () => {
    expect(stripWikitext("this is '''bold''' and ''italic'' text")).toBe('this is bold and italic text');
  });

  it('strips heading markers but keeps the heading text', () => {
    expect(stripWikitext('== History ==\nSome text')).toBe('History\nSome text');
  });

  it('removes ref tags including their content, and self-closing refs', () => {
    expect(stripWikitext('A fact<ref>some citation</ref> and another<ref name="x"/>.')).toBe('A fact and another.');
  });

  it('removes html comments', () => {
    expect(stripWikitext('Visible <!-- hidden note --> text')).toBe('Visible  text');
  });

  it('strips leading list and indent markers per line', () => {
    expect(stripWikitext('* first\n** second\n# third')).toBe('first\nsecond\nthird');
  });

  it('collapses three or more newlines down to two', () => {
    expect(stripWikitext('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips a leading redirect directive down to nothing when the page has no other content', () => {
    expect(stripWikitext('#REDIRECT [[Wp/aeb/عسلامة]]')).toBe('');
  });

  it('strips a leading redirect directive but keeps real content that follows it', () => {
    expect(stripWikitext('#REDIRECT [[Wp/aeb/تونس العاصمة]]\nTounes Elɛasma\nhiya asmet bladna.')).toBe(
      'Tounes Elɛasma\nhiya asmet bladna.',
    );
  });

  it('is case-insensitive and tolerates a colon after redirect', () => {
    expect(stripWikitext('#redirect: [[Target]]')).toBe('');
  });
});
