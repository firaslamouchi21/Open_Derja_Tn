import { BadRequestException } from '@nestjs/common';
import { OAuthController } from '../../../../../../../../control-plane/backend/src/infra/auth/oauth/oauth.controller';

function makeOAuthService(overrides: Record<string, unknown> = {}) {
  return {
    provider: jest.fn().mockReturnValue({ authorizeUrl: jest.fn((state: string) => `https://provider.example/authorize?state=${state}`) }),
    resolveLogin: jest.fn().mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    ...overrides,
  } as any;
}

function makeReqRes(overrides: Partial<{ cookies: Record<string, string> }> = {}) {
  const req: any = {
    ip: '1.2.3.4',
    socket: { remoteAddress: '1.2.3.4' },
    cookies: overrides.cookies ?? {},
    headers: {},
  };
  const res: any = { cookie: jest.fn(), clearCookie: jest.fn(), redirect: jest.fn() };
  return { req, res };
}

const ORIGINAL_ENV = process.env.OAUTH_SUCCESS_REDIRECT;

afterEach(() => {
  process.env.OAUTH_SUCCESS_REDIRECT = ORIGINAL_ENV;
  jest.clearAllMocks();
});

describe('OAuthController.authorize', () => {
  it('sets an httpOnly state cookie scoped to /auth/oauth and redirects to the provider', () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { res } = makeReqRes();

    controller.authorize('github', res);

    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_state',
      expect.stringMatching(/^github:[0-9a-f]{48}$/),
      expect.objectContaining({ httpOnly: true, path: '/auth/oauth' }),
    );
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('https://provider.example/authorize'));
  });
});

describe('OAuthController.callback', () => {
  it('rejects when code or state is missing, without touching the oauth service', async () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { req, res } = makeReqRes();

    await expect(controller.callback('github', undefined, 'state1', req, res)).rejects.toThrow(BadRequestException);
    expect(oauthService.resolveLogin).not.toHaveBeenCalled();
  });

  it('rejects when there is no state cookie at all', async () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { req, res } = makeReqRes();

    await expect(controller.callback('github', 'code1', 'state1', req, res)).rejects.toThrow(BadRequestException);
  });

  it('rejects when the state cookie does not match the query state', async () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { req, res } = makeReqRes({ cookies: { oauth_state: 'github:wrong-state' } });

    await expect(controller.callback('github', 'code1', 'state1', req, res)).rejects.toThrow(BadRequestException);
  });

  it('rejects a state cookie minted for a different provider, even with the right nonce', async () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { req, res } = makeReqRes({ cookies: { oauth_state: 'google:state1' } });

    await expect(controller.callback('github', 'code1', 'state1', req, res)).rejects.toThrow(BadRequestException);
  });

  it('accepts a matching state, clears the state cookie, and returns the access token in the body by default', async () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { req, res } = makeReqRes({ cookies: { oauth_state: 'github:state1' } });
    delete process.env.OAUTH_SUCCESS_REDIRECT;

    const result = await controller.callback('github', 'code1', 'state1', req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', { path: '/auth/oauth' });
    expect(oauthService.resolveLogin).toHaveBeenCalledWith('github', 'code1', expect.any(String), undefined);
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-1', expect.objectContaining({ httpOnly: true, path: '/auth' }));
    expect(result).toEqual({ accessToken: 'access-1' });
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirects with the token in the URL fragment when OAUTH_SUCCESS_REDIRECT is set, and returns nothing in the body', async () => {
    const oauthService = makeOAuthService();
    const controller = new OAuthController(oauthService);
    const { req, res } = makeReqRes({ cookies: { oauth_state: 'github:state1' } });
    process.env.OAUTH_SUCCESS_REDIRECT = 'https://app.example/done';

    const result = await controller.callback('github', 'code1', 'state1', req, res);

    expect(res.redirect).toHaveBeenCalledWith('https://app.example/done#access_token=access-1');
    expect(result).toBeUndefined();
  });
});
