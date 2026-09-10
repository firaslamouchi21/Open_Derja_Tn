import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthProvider, User } from '@open-derja/db';
import { PrismaService } from '../../database/prisma.service';
import { AuthService, type AuthTokens } from '../auth.service';
import { GithubOAuthProvider } from './github.provider';
import { GoogleOAuthProvider } from './google.provider';
import type { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const TWO_FACTOR_ROLES = new Set(['admin', 'superadmin']);

@Injectable()
export class OAuthService {
  private readonly providers: Record<'github' | 'google', OAuthProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    github: GithubOAuthProvider,
    google: GoogleOAuthProvider,
  ) {
    this.providers = { github, google };
  }

  provider(name: string): OAuthProvider {
    const provider = this.providers[name as 'github' | 'google'];
    if (!provider) {
      throw new UnauthorizedException(`Unknown identity provider "${name}"`);
    }
    if (!provider.isConfigured()) {
      throw new UnauthorizedException(`${name} sign-in is not configured on this server`);
    }
    return provider;
  }

  async resolveLogin(
    providerName: 'github' | 'google',
    code: string,
    ipHash: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthTokens> {
    const profile = await this.provider(providerName).fetchProfile(code);
    const user = await this.resolveUser(providerName, profile);

    if (!user.active) {
      throw new UnauthorizedException('This account is disabled');
    }

    const twofaPending = TWO_FACTOR_ROLES.has(user.role);
    return this.authService.startSession(user, ipHash, userAgent, { twofaPending });
  }

  private async resolveUser(providerName: AuthProvider, profile: OAuthProfile): Promise<User> {
    const existing = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider: providerName, providerUserId: profile.providerUserId } },
      include: { user: true },
    });
    if (existing) {
      return existing.user;
    }

    if (!profile.email || !profile.emailVerified) {
      throw new UnauthorizedException(
        'Your provider account has no verified email — cannot match it to an OpenDerja account',
      );
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      await this.prisma.authIdentity.create({
        data: { userId: byEmail.id, provider: providerName, providerUserId: profile.providerUserId, email: profile.email },
      });
      return byEmail;
    }

    const invite = await this.prisma.reviewerInvite.findFirst({
      where: { email: profile.email, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!invite) {
      throw new UnauthorizedException('There is no OpenDerja account for this identity. Ask an admin for an invite.');
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: profile.email,
          displayName: profile.displayName,
          role: 'reviewer',
          regionSelfReported: invite.region,
          active: true,
          emailConfirmed: true,
        },
      });
      await tx.authIdentity.create({
        data: { userId: created.id, provider: providerName, providerUserId: profile.providerUserId, email: profile.email },
      });
      await tx.reviewerInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedUserId: created.id },
      });
      return created;
    });
  }
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
