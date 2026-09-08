import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../../../../../../../control-plane/backend/src/infra/auth/auth.controller';

function makeAuthService() {
  return {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    guestSession: jest.fn(),
    completeSessionAfter2fa: jest.fn(),
  } as any;
}

function makeTotpService() {
  return {
    beginEnrollment: jest.fn(),
    confirmEnrollment: jest.fn(),
    assertCode: jest.fn(),
    requireEnrolledCode: jest.fn(),
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

describe('AuthController.guestSession', () => {
  it('mints a session_id cookie for a first-time visitor and forwards it to the service', async () => {
    const authService = makeAuthService();
    authService.guestSession.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const controller = new AuthController(authService, {} as any);
    const { req, res } = makeReqRes();

    const result = await controller.guestSession(req, res);

    expect(result).toEqual({ accessToken: 'access-1' });
    expect(res.cookie).toHaveBeenCalledWith('session_id', expect.any(String), expect.objectContaining({ httpOnly: true }));
    const sessionIdUsed = authService.guestSession.mock.calls[0][0];
    expect(typeof sessionIdUsed).toBe('string');
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-1', expect.objectContaining({ httpOnly: true, path: '/auth' }));
  });

  it('reuses an existing session_id cookie instead of minting a new one', async () => {
    const authService = makeAuthService();
    authService.guestSession.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const controller = new AuthController(authService, {} as any);
    const { req, res } = makeReqRes({ cookies: { session_id: 'existing-session' } });

    await controller.guestSession(req, res);

    expect(authService.guestSession).toHaveBeenCalledWith('existing-session', expect.any(String), undefined);
    expect(res.cookie).not.toHaveBeenCalledWith('session_id', expect.any(String), expect.anything());
  });
});

describe('AuthController.verify2fa', () => {
  const USER = { id: 'admin-1', role: 'admin', trustLevel: 0, emailConfirmed: true, sessionId: 's1', twofaPending: true };

  it('never enrolled: rejects rather than minting a token — regression test for the bypass', async () => {
    const authService = makeAuthService();
    const totpService = makeTotpService();
    totpService.requireEnrolledCode.mockRejectedValue(new BadRequestException('Two-factor authentication has not been enrolled for this account'));
    const controller = new AuthController(authService, totpService);
    const { req, res } = makeReqRes();

    await expect(controller.verify2fa(USER as any, { code: 'anything' } as any, req, res)).rejects.toThrow(BadRequestException);
    expect(authService.completeSessionAfter2fa).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('enrolled with a correct code: issues a full session', async () => {
    const authService = makeAuthService();
    authService.completeSessionAfter2fa.mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    const totpService = makeTotpService();
    totpService.requireEnrolledCode.mockResolvedValue(undefined);
    const controller = new AuthController(authService, totpService);
    const { req, res } = makeReqRes();

    const result = await controller.verify2fa(USER as any, { code: '123456' } as any, req, res);

    expect(totpService.requireEnrolledCode).toHaveBeenCalledWith('admin-1', '123456');
    expect(result).toEqual({ accessToken: 'access-2' });
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
