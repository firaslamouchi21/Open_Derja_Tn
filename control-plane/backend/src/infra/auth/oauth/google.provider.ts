import { Injectable, UnauthorizedException } from '@nestjs/common';
import { decodeJwt } from 'jose';
import type { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const DEFAULT_CALLBACK = 'http://localhost:3000/auth/oauth/google/callback';

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  readonly name = 'google' as const;

  private get clientId(): string | undefined {
    return process.env.OAUTH_GOOGLE_CLIENT_ID;
  }
  private get clientSecret(): string | undefined {
    return process.env.OAUTH_GOOGLE_CLIENT_SECRET;
  }
  private get callbackUrl(): string {
    return process.env.OAUTH_GOOGLE_CALLBACK_URL ?? DEFAULT_CALLBACK;
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  authorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId ?? '',
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async fetchProfile(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId ?? '',
        client_secret: this.clientSecret ?? '',
        code,
        redirect_uri: this.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });
    const tokenBody = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenBody.id_token) {
      throw new UnauthorizedException('Google rejected the authorization code');
    }

    const claims = decodeJwt(tokenBody.id_token) as {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
    };
    if (!claims.sub) {
      throw new UnauthorizedException('Could not read the Google profile');
    }

    return {
      providerUserId: claims.sub,
      email: claims.email ?? null,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      displayName: claims.name ?? null,
    };
  }
}
