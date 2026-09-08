import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const SESSION_COOKIE = 'session_id';
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function resolveContributorSessionId(req: Request, res: Response): string {
  const existing = req.cookies?.[SESSION_COOKIE];
  if (existing) {
    return existing;
  }
  const sessionId = randomUUID();
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
  });
  return sessionId;
}
