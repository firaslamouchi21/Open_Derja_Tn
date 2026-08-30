import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../../../../../../../control-plane/backend/src/infra/auth/auth.controller';

function makeAuthService() {
  return {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  } as any;
}

function makeReqRes(overrides: Partial<{ cookies: Record<string, string>; headers: Record<string, string> }> = {}) {
  const req: any = {
    ip: '1.2.3.4',
    socket: { remoteAddress: '1.2.3.4' },
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  };
  const res: any = { cookie: jest.fn(), clearCookie: jest.fn() };
  return { req, res };
}

describe('AuthController.login', () => {
  it('sets the refresh and csrf cookies and returns only the access token in the body', async () => {
    const authService = makeAuthService();
    authService.login.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const controller = new AuthController(authService, {} as any);
    const { req, res } = makeReqRes();

    const result = await controller.login({ email: 'a@b.com', password: 'x' } as any, req, res);

    expect(result).toEqual({ accessToken: 'access-1' });
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-1', expect.objectContaining({ httpOnly: true, path: '/auth' }));
    expect(res.cookie).toHaveBeenCalledWith('csrf_token', expect.any(String), expect.objectContaining({ httpOnly: false }));
  });
});

describe('AuthController.refresh', () => {
  it('rejects immediately when there is no refresh_token cookie, without calling the service', async () => {
    const authService = makeAuthService();
    const controller = new AuthController(authService, {} as any);
    const { req, res } = makeReqRes();

    await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('forwards the refresh cookie and the csrf header/cookie pair to the service', async () => {
    const authService = makeAuthService();
    authService.refresh.mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    const controller = new AuthController(authService, {} as any);
    const { req, res } = makeReqRes({
      cookies: { refresh_token: 'old-refresh', csrf_token: 'csrf-cookie-value' },
      headers: { 'x-csrf-token': 'csrf-header-value' },
    });

    const result = await controller.refresh(req, res);

    expect(authService.refresh).toHaveBeenCalledWith('old-refresh', 'csrf-header-value', 'csrf-cookie-value');
    expect(result).toEqual({ accessToken: 'access-2' });
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-2', expect.anything());
  });
});

describe('AuthController.logout', () => {
  it('revokes the session and clears both auth cookies', async () => {
    const authService = makeAuthService();
    authService.logout.mockResolvedValue(undefined);
    const controller = new AuthController(authService, {} as any);
    const { res } = makeReqRes();
    const user = { id: 'u1', role: 'contributor', trustLevel: 0, emailConfirmed: true, sessionId: 'session-1' };

    const result = await controller.logout(user as any, res);

    expect(authService.logout).toHaveBeenCalledWith('session-1');
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/auth' });
    expect(res.clearCookie).toHaveBeenCalledWith('csrf_token');
    expect(result).toEqual({ loggedOut: true });
  });
});
