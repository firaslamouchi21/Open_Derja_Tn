import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as argon2 from 'argon2';
import { isPasswordBreached } from '@open-derja/core';
import type { User, UserRole } from '@open-derja/db';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import { EmailOtpService } from './email-otp.service';
import { TotpService } from './totp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto, ConfirmPasswordResetDto } from './dto/auth-flows.dto';

const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set(['reviewer', 'admin', 'superadmin']);

async function assertPasswordAllowed(password: string, role: UserRole): Promise<void> {
  if (PRIVILEGED_ROLES.has(role) && (await isPasswordBreached(password))) {
    throw new BadRequestException('That password appears in a known breach corpus — choose another');
  }
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const TWO_FACTOR_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'superadmin']);

@Injectable()
export class AuthService {
  private dummyHash: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly emailOtp: EmailOtpService,
    private readonly totp: TotpService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Could not complete registration');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          role: 'contributor',
          active: true,
          emailConfirmed: false,
        },
      });
      await tx.authIdentity.create({
        data: { userId: created.id, provider: 'password', providerUserId: created.id, email: dto.email },
      });
      await this.emailOtp.issue({ userId: created.id, email: dto.email, purpose: 'email_verify' }, tx);
      return created;
    });

    return { id: user.id, email: user.email, role: user.role };
  }

  async startSession(
    user: Pick<User, 'id' | 'role' | 'tokenVersion'>,
    ipHash: string | undefined,
    userAgent: string | undefined,
    opts: { twofaPending?: boolean } = {},
  ): Promise<AuthTokens> {
    const session = await this.prisma.refreshSession.create({
      data: { userId: user.id, jti: randomBytes(32).toString('hex'), ipHash, userAgent },
    });
    return this.issueTokens(user.id, user.role, user.tokenVersion, session.id, session.jti, opts.twofaPending);
  }

  async login(dto: LoginDto, ipHash: string | undefined, userAgent: string | undefined): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      await argon2.verify(await this.getDummyHash(), dto.password).catch(() => undefined);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked, try again later');
    }

    const passwordOk = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordOk) {
      const attempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : undefined,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    let twofaPending = false;
    if (TWO_FACTOR_ROLES.has(user.role)) {
      if (user.totpEnabled) {
        await this.totp.assertCode(user.id, dto.totpCode);
      } else {
        twofaPending = true;
      }
    }

    return this.startSession(user, ipHash, userAgent, { twofaPending });
  }

  async completeSessionAfter2fa(userId: string, ipHash: string | undefined, userAgent: string | undefined): Promise<AuthTokens> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.startSession(user, ipHash, userAgent);
  }

  async guestSession(sessionId: string, ipHash: string | undefined, userAgent: string | undefined): Promise<AuthTokens> {
    let user = await this.prisma.user.findUnique({ where: { id: sessionId } });

    if (user && user.role !== 'contributor') {
      throw new UnauthorizedException('Invalid session');
    }

    if (!user) {
      try {
        user = await this.prisma.user.create({ data: { id: sessionId, role: 'contributor' } });
      } catch {
        user = await this.prisma.user.findUniqueOrThrow({ where: { id: sessionId } });
        if (user.role !== 'contributor') {
          throw new UnauthorizedException('Invalid session');
        }
      }
    }

    if (!user.active) {
      throw new UnauthorizedException('This session has been disabled');
    }

    return this.startSession(user, ipHash, userAgent);
  }

  async refresh(refreshToken: string, csrfHeader: string | undefined, csrfCookie: string | undefined): Promise<AuthTokens> {
    this.assertCsrfMatch(csrfHeader, csrfCookie);

    const payload = await this.tokenService.verifyRefreshToken(refreshToken).catch(() => undefined);
    if (!payload || !payload.sid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session no longer valid');
    }

    if (session.jti !== payload.rjti) {
      await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected, session revoked');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active || user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('Invalid session');
    }

    const newJti = randomBytes(32).toString('hex');
    await this.prisma.refreshSession.update({ where: { id: session.id }, data: { jti: newJti } });

    const twofaPending = TWO_FACTOR_ROLES.has(user.role) && !user.totpEnabled;
    return this.issueTokens(user.id, user.role, user.tokenVersion, session.id, newJti, twofaPending);
  }

  async requestEmailVerification(userId: string): Promise<{ sent: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailConfirmed) {
      return { sent: true };
    }
    if (!user.email) {
      throw new BadRequestException('This account has no email address to verify');
    }
    await this.emailOtp.issue({ userId, email: user.email, purpose: 'email_verify' });
    return { sent: true };
  }

  async confirmEmailVerification(userId: string, code: string): Promise<{ emailConfirmed: true }> {
    await this.emailOtp.consume(userId, 'email_verify', code);
    await this.prisma.user.update({ where: { id: userId }, data: { emailConfirmed: true } });
    return { emailConfirmed: true };
  }

  async requestPasswordReset(email: string): Promise<{ sent: true }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.email && user.passwordHash) {
      await this.emailOtp.issue({ userId: user.id, email: user.email, purpose: 'password_reset' }).catch(() => undefined);
    }
    return { sent: true };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{ reset: true }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException('Code is invalid or has expired');
    }
    await this.emailOtp.consume(user.id, 'password_reset', dto.code);
    await assertPasswordAllowed(dto.newPassword, user.role);
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await this.revokeAllSessions(user.id);
    return { reset: true };
  }

  async acceptInvite(dto: AcceptInviteDto, ipHash: string | undefined, userAgent: string | undefined): Promise<AuthTokens> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const invite = await this.prisma.reviewerInvite.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invite) {
      throw new BadRequestException('This invitation is invalid, already used, or expired');
    }
    if (dto.password) {
      await assertPasswordAllowed(dto.password, 'reviewer');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invite.email,
          displayName: dto.displayName,
          passwordHash: dto.password ? await argon2.hash(dto.password, { type: argon2.argon2id }) : null,
          role: 'reviewer',
          regionSelfReported: invite.region,
          active: true,
          emailConfirmed: true,
        },
      });
      if (dto.password) {
        await tx.authIdentity.create({
          data: { userId: created.id, provider: 'password', providerUserId: created.id, email: invite.email },
        });
      }
      await tx.reviewerInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedUserId: created.id },
      });
      return created;
    });

    return this.startSession(user, ipHash, userAgent);
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }
    await this.prisma.refreshSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
      this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  private async issueTokens(
    userId: string,
    role: string,
    tokenVersion: number,
    sessionId: string,
    jti: string,
    twofaPending = false,
  ): Promise<AuthTokens> {
    const accessToken = await this.tokenService.signAccessToken({
      sub: userId,
      role,
      ver: tokenVersion,
      sid: sessionId,
      twofa: twofaPending ? 'pending' : undefined,
    });
    const refreshToken = await this.tokenService.signRefreshToken({
      sub: userId,
      role,
      ver: tokenVersion,
      rjti: jti,
      sid: sessionId,
    });
    return { accessToken, refreshToken };
  }

  private assertCsrfMatch(header: string | undefined, cookie: string | undefined): void {
    if (!header || !cookie) {
      throw new UnauthorizedException('Missing CSRF token');
    }
    const headerBuf = Buffer.from(header);
    const cookieBuf = Buffer.from(cookie);
    if (headerBuf.length !== cookieBuf.length || !timingSafeEqual(headerBuf, cookieBuf)) {
      throw new UnauthorizedException('CSRF token mismatch');
    }
  }

  private async getDummyHash(): Promise<string> {
    if (!this.dummyHash) {
      this.dummyHash = await argon2.hash('dummy-password-for-timing-safety', { type: argon2.argon2id });
    }
    return this.dummyHash;
  }
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'dev-salt-change-in-production';
  return createHash('sha256').update(`${ip}${salt}`).digest('hex');
}
