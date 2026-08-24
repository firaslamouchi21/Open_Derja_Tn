import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private dummyHash: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Could not complete registration');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        role: 'contributor',
        active: true,
        emailConfirmed: false,
      },
    });

    return { id: user.id, email: user.email, role: user.role };
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

    const session = await this.prisma.refreshSession.create({
      data: { userId: user.id, jti: randomBytes(32).toString('hex'), ipHash, userAgent },
    });

    return this.issueTokens(user.id, user.role, user.tokenVersion, session.id, session.jti);
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

    return this.issueTokens(user.id, user.role, user.tokenVersion, session.id, newJti);
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

  private async issueTokens(userId: string, role: string, tokenVersion: number, sessionId: string, jti: string): Promise<AuthTokens> {
    const accessToken = await this.tokenService.signAccessToken({ sub: userId, role, ver: tokenVersion, sid: sessionId });
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
