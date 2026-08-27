import { ingestDocument } from '../../../../../../control-plane/backend/core/src/ingestion/ingest-document';

function makeTx() {
  let corpusItemSeq = 0;
  return {
    document: { create: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
    corpusItem: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `item-${++corpusItemSeq}`, ...data })),
    },
    task: { create: jest.fn().mockResolvedValue({ id: 'task-1' }) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>) {
  return { $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)) } as any;
}

const SOURCE = { id: 'source-1', licenseDefault: 'unknown' } as any;

function fetchedItem(rawBody: string) {
  return { externalRef: 'ext-1', rawBody, fetchedAt: new Date('2026-01-01') };
}

describe('ingestDocument', () => {
  it('creates the document but no corpus items when the cleaned text fails the length filter', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    const result = await ingestDocument(prisma, SOURCE, fetchedItem('hi'));

    expect(tx.document.create).toHaveBeenCalled();
    expect(tx.corpusItem.create).not.toHaveBeenCalled();
    expect(result).toEqual({ documentId: 'doc-1', corpusItemIds: [], nearDuplicatesSkipped: 0 });
  });

  it('creates no corpus items when the text does not match any required marker', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    const result = await ingestDocument(prisma, SOURCE, fetchedItem('a perfectly long enough sentence here'), ['chnowa']);

    expect(tx.corpusItem.create).not.toHaveBeenCalled();
    expect(result.corpusItemIds).toEqual([]);
  });

  it('inserts a single-sentence paragraph directly as one leaf item, with no parent row', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    const result = await ingestDocument(prisma, SOURCE, fetchedItem('Hi there my old friend.'));

    expect(tx.corpusItem.create).toHaveBeenCalledTimes(1);
    const call = tx.corpusItem.create.mock.calls[0][0].data;
    expect(call.parentId).toBeUndefined();
    expect(call.text).toBe('Hi there my old friend.');
    expect(result.corpusItemIds).toEqual(['item-1']);
  });

  it('splits a multi-sentence paragraph into a parent row plus one child leaf per sentence', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    await ingestDocument(prisma, SOURCE, fetchedItem('Hi there friend. Chnowa hwelek today?'));

    expect(tx.corpusItem.create).toHaveBeenCalledTimes(3);
    const [parentCall, firstSentenceCall, secondSentenceCall] = tx.corpusItem.create.mock.calls.map((c) => c[0].data);
    expect(parentCall.unit).toBe('paragraph');
    expect(firstSentenceCall.parentId).toBe('item-1');
    expect(secondSentenceCall.parentId).toBe('item-1');
    expect(firstSentenceCall.text).toBe('Hi there friend.');
    expect(secondSentenceCall.text).toBe('Chnowa hwelek today?');
  });

  it('skips inserting a near-duplicate and counts it, without creating a corpus item for it', async () => {
    const tx = makeTx();
    tx.$queryRaw.mockResolvedValue([{ id: 'existing-item', text: 'Hi there my old friend.' }]);
    const prisma = makePrisma(tx);

    const result = await ingestDocument(prisma, SOURCE, fetchedItem('Hi there my old friend.'));

    expect(tx.corpusItem.create).not.toHaveBeenCalled();
    expect(result.corpusItemIds).toEqual([]);
    expect(result.nearDuplicatesSkipped).toBe(1);
  });

  it('still inserts when a candidate exists but falls below the near-duplicate similarity threshold', async () => {
    const tx = makeTx();
    tx.$queryRaw.mockResolvedValue([{ id: 'existing-item', text: 'A totally unrelated sentence about something else.' }]);
    const prisma = makePrisma(tx);

    const result = await ingestDocument(prisma, SOURCE, fetchedItem('Hi there my old friend.'));

    expect(tx.corpusItem.create).toHaveBeenCalledTimes(1);
    expect(result.nearDuplicatesSkipped).toBe(0);
  });

  it('spawns a review task for every corpus item actually inserted', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    await ingestDocument(prisma, SOURCE, fetchedItem('Hi there my old friend.'));

    expect(tx.task.create).toHaveBeenCalledTimes(1);
    expect(tx.task.create.mock.calls[0][0].data).toMatchObject({ corpusItemId: 'item-1', type: 'review', itemVersion: 1 });
  });
});
