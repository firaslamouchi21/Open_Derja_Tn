import { checkNearDuplicates } from '../../../../../../control-plane/backend/core/src/ingestion/dedup-client';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('checkNearDuplicates', () => {
  it('returns no duplicate immediately when there are no candidates, without calling fetch', async () => {
    global.fetch = jest.fn();

    const result = await checkNearDuplicates('some text', [], 'http://data-plane:8002');

    expect(result).toEqual({ isNearDuplicate: false, matches: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('computes locally when no data-plane url is configured', async () => {
    global.fetch = jest.fn();

    const result = await checkNearDuplicates('chnowa hwelek ya sahbi', [{ id: 'a', text: 'chnowa   hwelek ya sahbi' }], undefined);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.isNearDuplicate).toBe(true);
    expect(result.matches.map((m) => m.id)).toEqual(['a']);
  });

  it('calls the data-plane endpoint and maps its response when a url is configured', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ is_near_duplicate: true, matches: [{ id: 'a', similarity: 0.97 }] }),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await checkNearDuplicates('text', [{ id: 'a', text: 'candidate' }], 'http://data-plane:8002');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://data-plane:8002/dedup/check',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'text', candidates: [{ id: 'a', text: 'candidate' }] }),
      }),
    );
    expect(result).toEqual({ isNearDuplicate: true, matches: [{ id: 'a', similarity: 0.97 }] });
  });

  it('falls back to the local computation when the data-plane responds with a non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await checkNearDuplicates('chnowa hwelek ya sahbi', [{ id: 'a', text: 'chnowa   hwelek ya sahbi' }], 'http://data-plane:8002');

    expect(result.isNearDuplicate).toBe(true);
    expect(result.matches.map((m) => m.id)).toEqual(['a']);
  });

  it('falls back to the local computation when the data-plane call throws (e.g. unreachable)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await checkNearDuplicates('chnowa hwelek ya sahbi', [{ id: 'a', text: 'completely unrelated text here' }], 'http://data-plane:8002');

    expect(result.isNearDuplicate).toBe(false);
  });
});
