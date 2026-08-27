import {
  onConsensusLowAgreement,
  onCorpusItemIngested,
  onCorpusItemStandardised,
  onRegionTagDone,
  onReviewApproved,
  onTranslationAdded,
  tasksInvalidatedBy,
} from '../../../../../../control-plane/backend/core/src/tasks/spawn-rules';

describe('onCorpusItemIngested', () => {
  it('spawns a single review task with an empty slot', () => {
    expect(onCorpusItemIngested('item-1', 1)).toEqual([
      { corpusItemId: 'item-1', itemVersion: 1, type: 'review', slot: '', requiresRole: 'reviewer' },
    ]);
  });
});

describe('onReviewApproved', () => {
  it('fans out to region_tag, translate_msa, and standardise', () => {
    const types = onReviewApproved('item-1', 2).map((t) => t.type);
    expect(types).toEqual(['region_tag', 'translate_msa', 'standardise']);
  });
});

describe('onRegionTagDone', () => {
  it('spawns two confirm tasks with distinct ordinal slots', () => {
    const specs = onRegionTagDone('item-1', 1);
    expect(specs.map((s) => s.slot)).toEqual(['1', '2']);
    expect(specs.every((s) => s.type === 'confirm')).toBe(true);
  });
});

describe('onTranslationAdded', () => {
  it('spawns transliterate_to_arabic for arabizi script', () => {
    expect(onTranslationAdded('item-1', 1, 'arabizi').map((t) => t.type)).toEqual(['transliterate_to_arabic']);
  });

  it('spawns transliterate_to_arabizi for arabic script', () => {
    expect(onTranslationAdded('item-1', 1, 'arabic').map((t) => t.type)).toEqual(['transliterate_to_arabizi']);
  });

  it('spawns nothing for latin or mixed script', () => {
    expect(onTranslationAdded('item-1', 1, 'latin')).toEqual([]);
    expect(onTranslationAdded('item-1', 1, 'mixed')).toEqual([]);
  });
});

describe('onConsensusLowAgreement', () => {
  it('spawns an adjudicate task with a span slot and target regions', () => {
    const specs = onConsensusLowAgreement('item-1', 1, 4, 10, ['sahel', 'north']);
    expect(specs).toEqual([
      {
        corpusItemId: 'item-1',
        itemVersion: 1,
        type: 'adjudicate',
        slot: '4:10',
        requiresRole: 'reviewer',
        targetRegions: ['sahel', 'north'],
      },
    ]);
  });
});

describe('onCorpusItemStandardised', () => {
  it('spawns one link_lemma task per token span, slotted by span', () => {
    const specs = onCorpusItemStandardised('item-1', 1, [
      { charStart: 0, charEnd: 4 },
      { charStart: 5, charEnd: 9 },
    ]);
    expect(specs.map((s) => s.slot)).toEqual(['0:4', '5:9']);
    expect(specs.every((s) => s.type === 'link_lemma')).toBe(true);
  });

  it('spawns nothing for an empty token list', () => {
    expect(onCorpusItemStandardised('item-1', 1, [])).toEqual([]);
  });
});

describe('tasksInvalidatedBy', () => {
  it('invalidates link_lemma tasks on standardisation', () => {
    expect(tasksInvalidatedBy('standardisation')).toEqual(['link_lemma']);
  });

  it('invalidates nothing for region retag, translation, or lemma link changes', () => {
    expect(tasksInvalidatedBy('region_retag')).toEqual([]);
    expect(tasksInvalidatedBy('translation')).toEqual([]);
    expect(tasksInvalidatedBy('lemma_link')).toEqual([]);
  });
});
