import { Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  typ: 'access';
  ver: number;
  sid?: string;
  twofa?: 'pending';
}

export interface RefreshTokenPayload {
  sub: string;
  role: string;
  typ: 'refresh';
  ver: number;
  rjti: string;
  sid?: string;
}

@Injectable()
export class TokenService {
  private readonly secret: Uint8Array;

  constructor() {
    const raw = process.env.AUTH_SECRET;
    if (!raw || raw.length < 32) {
      throw new Error('AUTH_SECRET must be set and at least 32 characters — refusing to start with a weak or missing secret');
    }
    this.secret = new TextEncoder().encode(raw);
  }

  async signAccessToken(payload: Omit<AccessTokenPayload, 'typ'>): Promise<string> {
    const claims: Record<string, unknown> = { ...payload, typ: 'access' };
    if (payload.twofa === undefined) {
      delete claims.twofa;
    }
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(this.secret);
  }

  async signRefreshToken(payload: Omit<RefreshTokenPayload, 'typ'>): Promise<string> {
    return new SignJWT({ ...payload, typ: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    if (payload.typ !== 'access') {
      throw new Error('Not an access token');
    }
    return payload as unknown as AccessTokenPayload;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    if (payload.typ !== 'refresh') {
      throw new Error('Not a refresh token');
    }
    return payload as unknown as RefreshTokenPayload;
  }
}
