import { collectSnapshotJsonl } from '../../../../../../control-plane/backend/core/src/export/build-snapshot';

function makePrisma(pages: unknown[][]) {
  let call = 0;
  return {
    corpusItem: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve(pages[call++] ?? [])),
    },
  } as never;
}

const item = {
  id: 'ci-1',
  text: 'برشة',
  canonicalForm: 'برشة',
  script: 'arabic',
  unit: 'sentence',
  datasetSplit: 'train',
  ruleVersion: 2,
  document: { license: 'cc_by_sa', rightsStatus: 'granted', source: { kind: 'forum' } },
  tags: [
    { kind: 'region', value: 'sahel' },
    { kind: 'region', value: 'south' },
    { kind: 'register', value: 'neutral' },
  ],
  tokens: [{ charStart: 0, charEnd: 4, surfaceText: 'برشة', link: { lexiconVariantId: 'lv-1' } }],
  translations: [{ targetLang: 'en', text: 'a lot', source: 'human', isPreferred: true }],
};

describe('collectSnapshotJsonl', () => {
  it('emits one JSONL line per corpus item with flattened annotations and paginates by cursor', async () => {
    const prisma = makePrisma([[item], []]);
    const { body, lines } = await collectSnapshotJsonl(prisma);

    expect(lines).toBe(1);
    const row = JSON.parse(body.trim());
    expect(row).toMatchObject({
      id: 'ci-1',
      dataset_split: 'train',
      regions: ['sahel', 'south'],
      register: 'neutral',
      document: { source_kind: 'forum', license: 'cc_by_sa' },
      tokens: [{ char_start: 0, char_end: 4, lexicon_variant_id: 'lv-1' }],
      translations: [{ target_lang: 'en', is_preferred: true }],
    });
  });

  it('produces nothing for an empty corpus', async () => {
    const { body, lines } = await collectSnapshotJsonl(makePrisma([[]]));
    expect(body).toBe('');
    expect(lines).toBe(0);
  });
});
