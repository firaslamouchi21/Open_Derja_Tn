import { resolveContributorSessionId } from '../../../../../../../control-plane/backend/src/common/utils/contributor-session';

function makeReqRes(cookies: Record<string, string> = {}) {
  const req: any = { cookies };
  const res: any = { cookie: jest.fn() };
  return { req, res };
}

describe('resolveContributorSessionId', () => {
  it('reuses an existing session_id cookie without minting a new one', () => {
    const { req, res } = makeReqRes({ session_id: 'existing-session-id' });

    const result = resolveContributorSessionId(req, res);

    expect(result).toBe('existing-session-id');
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('mints and sets a new httpOnly, 1-year session_id cookie when none exists', () => {
    const { req, res } = makeReqRes();

    const result = resolveContributorSessionId(req, res);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(res.cookie).toHaveBeenCalledWith(
      'session_id',
      result,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 60 * 60 * 1000 }),
    );
  });

  it('returns a different id on each call when no cookie is present', () => {
    const { req: req1, res: res1 } = makeReqRes();
    const { req: req2, res: res2 } = makeReqRes();

    const first = resolveContributorSessionId(req1, res1);
    const second = resolveContributorSessionId(req2, res2);

    expect(first).not.toBe(second);
  });
});
