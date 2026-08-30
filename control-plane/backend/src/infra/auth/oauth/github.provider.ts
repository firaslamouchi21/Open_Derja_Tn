import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const DEFAULT_CALLBACK = 'http://localhost:3000/auth/oauth/github/callback';

@Injectable()
export class GithubOAuthProvider implements OAuthProvider {
  readonly name = 'github' as const;

  private get clientId(): string | undefined {
    return process.env.OAUTH_GITHUB_CLIENT_ID;
  }
  private get clientSecret(): string | undefined {
    return process.env.OAUTH_GITHUB_CLIENT_SECRET;
  }
  private get callbackUrl(): string {
    return process.env.OAUTH_GITHUB_CALLBACK_URL ?? DEFAULT_CALLBACK;
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  authorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId ?? '',
      redirect_uri: this.callbackUrl,
      scope: 'read:user user:email',
      state,
      allow_signup: 'false',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async fetchProfile(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      throw new UnauthorizedException('GitHub rejected the authorization code');
    }

    const headers = {
      Authorization: `Bearer ${tokenBody.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'OpenDerja',
    };
    const [userResponse, emailsResponse] = await Promise.all([
      fetch('https://api.github.com/user', { headers }),
      fetch('https://api.github.com/user/emails', { headers }),
    ]);
    const user = (await userResponse.json()) as { id?: number; login?: string; name?: string | null };
    const emails = (await emailsResponse.json().catch(() => [])) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    if (!user.id) {
      throw new UnauthorizedException('Could not read the GitHub profile');
    }

    const primary = Array.isArray(emails)
      ? emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified)
      : undefined;

    return {
      providerUserId: String(user.id),
      email: primary?.email ?? null,
      emailVerified: !!primary?.verified,
      displayName: user.name ?? user.login ?? null,
    };
  }
}
