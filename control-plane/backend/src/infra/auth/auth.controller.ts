import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AllowUnverifiedEmail } from '../../common/decorators/allow-unverified-email.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { AuthService, hashIp } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'csrf_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const tokens = await this.authService.login(dto, hashIp(ip), req.headers['user-agent']);
    this.setAuthCookies(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @Public()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
    const csrfCookie = req.cookies?.[CSRF_COOKIE];

    const tokens = await this.authService.refresh(refreshToken, csrfHeader, csrfCookie);
    this.setAuthCookies(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @Roles('contributor', 'trusted_contributor', 'reviewer', 'admin', 'superadmin')
  @AllowUnverifiedEmail()
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sessionId);
    res.clearCookie(REFRESH_COOKIE);
    res.clearCookie(CSRF_COOKIE);
    return { loggedOut: true };
  }

  private setAuthCookies(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE, refreshToken, {
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
  }
}
