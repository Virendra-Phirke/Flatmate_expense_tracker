import { Request, Response } from 'express';
import { createHmac, randomBytes } from 'crypto';
import env from './env';

const CSRF_SECRET = env.JWT_SECRET;
export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate an HMAC-signed CSRF token bound to the user ID.
 */
export function generateCsrfToken(userId: string): string {
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(`${nonce}:${userId}`)
    .digest('hex');
  return `${nonce}.${signature}`;
}

/**
 * Validate an HMAC-signed CSRF token for the specified user ID.
 */
export function verifyCsrfToken(token: string | undefined | null, userId: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(`${nonce}:${userId}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Set the readable CSRF cookie for client-side inclusion in state-changing requests.
 */
export function setCsrfCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by frontend JS to set X-CSRF-Token header
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}
