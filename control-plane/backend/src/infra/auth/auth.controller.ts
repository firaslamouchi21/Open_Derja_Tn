import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AllowUnverifiedEmail } from '../../common/decorators/allow-unverified-email.decorator';
import { Allow2faEnrollment } from '../../common/decorators/allow-2fa-enrollment.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/guards/request-user.interface';
import { resolveContributorSessionId } from '../../common/utils/contributor-session';
import { AuthService, hashIp, type AuthTokens } from './auth.service';
import { TotpService } from './totp.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AcceptInviteDto,
  ConfirmPasswordResetDto,
  OtpConfirmDto,
  RequestPasswordResetDto,
  TotpConfirmDto,
} from './dto/auth-flows.dto';

const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'csrf_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ALL_ROLES = ['contributor', 'trusted_contributor', 'reviewer', 'admin', 'superadmin'] as const;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly totpService: TotpService,
  ) {}

  @Post('register')
  @Public()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto, this.ipHash(req), req.headers['user-agent']);
    return this.respondWithTokens(res, tokens);
  }

  @Post('guest-session')
  @Public()
  async guestSession(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = resolveContributorSessionId(req, res);
    const tokens = await this.authService.guestSession(sessionId, this.ipHash(req), req.headers['user-agent']);
    return this.respondWithTokens(res, tokens);
  }

  @Post('refresh')
  @Public()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokens = await this.authService.refresh(
      refreshToken,
      req.headers['x-csrf-token'] as string | undefined,
      req.cookies?.[CSRF_COOKIE],
    );
    return this.respondWithTokens(res, tokens);
  }

  @Post('logout')
  @Roles(...ALL_ROLES)
  @AllowUnverifiedEmail()
  @Allow2faEnrollment()
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sessionId);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    res.clearCookie(CSRF_COOKIE);
    return { loggedOut: true };
  }

  @Post('verify-email/request')
  @Roles(...ALL_ROLES)
  @AllowUnverifiedEmail()
  requestEmailVerification(@CurrentUser() user: RequestUser) {
    return this.authService.requestEmailVerification(user.id);
  }

  @Post('verify-email/confirm')
  @Roles(...ALL_ROLES)
  @AllowUnverifiedEmail()
  confirmEmailVerification(@CurrentUser() user: RequestUser, @Body() dto: OtpConfirmDto) {
    return this.authService.confirmEmailVerification(user.id, dto.code);
  }

  @Post('password-reset/request')
  @Public()
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @Public()
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post('accept-invite')
  @Public()
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.acceptInvite(dto, this.ipHash(req), req.headers['user-agent']);
    return this.respondWithTokens(res, tokens);
  }

  @Post('2fa/enroll')
  @Roles('admin', 'superadmin')
  @AllowUnverifiedEmail()
  @Allow2faEnrollment()
  enroll2fa(@CurrentUser() user: RequestUser) {
    return this.totpService.beginEnrollment(user.id);
  }

  @Post('2fa/confirm')
  @Roles('admin', 'superadmin')
  @AllowUnverifiedEmail()
  @Allow2faEnrollment()
  async confirm2fa(
    @CurrentUser() user: RequestUser,
    @Body() dto: TotpConfirmDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.totpService.confirmEnrollment(user.id, dto.code);
    const tokens = await this.authService.completeSessionAfter2fa(user.id, this.ipHash(req), req.headers['user-agent']);
    return this.respondWithTokens(res, tokens);
  }

  @Post('2fa/verify')
  @Roles('admin', 'superadmin')
  @AllowUnverifiedEmail()
  @Allow2faEnrollment()
  async verify2fa(
    @CurrentUser() user: RequestUser,
    @Body() dto: TotpConfirmDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.totpService.requireEnrolledCode(user.id, dto.code);
    const tokens = await this.authService.completeSessionAfter2fa(user.id, this.ipHash(req), req.headers['user-agent']);
    return this.respondWithTokens(res, tokens);
  }

  private ipHash(req: Request): string {
    return hashIp(req.ip ?? req.socket.remoteAddress ?? 'unknown');
  }

  private respondWithTokens(res: Response, tokens: AuthTokens): { accessToken: string } {
    this.setAuthCookies(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
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
