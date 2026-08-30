export interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface OAuthProvider {
  readonly name: 'github' | 'google';
  isConfigured(): boolean;
  authorizeUrl(state: string): string;
  fetchProfile(code: string): Promise<OAuthProfile>;
}
