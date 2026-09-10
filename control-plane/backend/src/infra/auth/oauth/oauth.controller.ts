import { BadRequestException, Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Public } from '../../../common/decorators/public.decorator';
import { hashIp } from '../auth.service';
import { OAuthService } from './oauth.service';

const STATE_COOKIE = 'oauth_state';
const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'csrf_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get(':provider')
  @Public()
  authorize(@Param('provider') providerName: string, @Res({ passthrough: true }) res: Response) {
    const provider = this.oauthService.provider(providerName);
    const state = randomBytes(24).toString('hex');
    res.cookie(STATE_COOKIE, `${providerName}:${state}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_TTL_MS,
      path: '/auth/oauth',
    });
    res.redirect(provider.authorizeUrl(state));
  }

  @Get(':provider/callback')
  @Public()
  async callback(
    @Param('provider') providerName: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }
    this.assertState(req, providerName, state);
    res.clearCookie(STATE_COOKIE, { path: '/auth/oauth' });

    const tokens = await this.oauthService.resolveLogin(
      providerName as 'github' | 'google',
      code,
      hashIp(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
      req.headers['user-agent'],
    );

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TTL_MS,
      path: '/auth',
    });
    res.cookie(CSRF_COOKIE, randomBytes(24).toString('hex'), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TTL_MS,
    });

    const redirectTo = process.env.OAUTH_SUCCESS_REDIRECT;
    if (redirectTo) {
      res.redirect(`${redirectTo}#access_token=${encodeURIComponent(tokens.accessToken)}`);
      return undefined;
    }
    return { accessToken: tokens.accessToken };
  }

  private assertState(req: Request, providerName: string, state: string): void {
    const cookie: string | undefined = req.cookies?.[STATE_COOKIE];
    const expected = `${providerName}:${state}`;
    if (!cookie || cookie.length !== expected.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(expected))) {
      throw new BadRequestException('OAuth state mismatch');
    }
  }
}
