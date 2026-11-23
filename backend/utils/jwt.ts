import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import env from './env';

const isProd = env.NODE_ENV === 'production';
const JWT_SECRET = env.JWT_SECRET;
export const AUTH_COOKIE_NAME = 'auth_token';

export interface UserSessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: 'admin' | 'member';
  householdId: string;
  householdName?: string;
  mustChangePassword?: boolean;
  tokenVersion?: number;
}

/**
 * Generate a signed JWT for the authenticated user.
 */
export function signToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export interface BiometricDevicePayload {
  type: 'biometric_device';
  userId: string;
  username: string;
  householdId: string;
  credentialId?: string;
}

/**
 * Generate a signed device-bound token for enrolled biometric devices.
 */
export function signBiometricDeviceToken(payload: Omit<BiometricDevicePayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'biometric_device' }, JWT_SECRET, { expiresIn: '90d' });
}

/**
 * Verify and decode an enrolled biometric device token.
 */
export function verifyBiometricDeviceToken(token: string): BiometricDevicePayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as BiometricDevicePayload;
    if (decoded && decoded.type === 'biometric_device') return decoded;
    return null;
  } catch {
    return null;
  }
}

/**
 * Verify and decode an authentication JWT.
 */
export function verifyToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSessionPayload;
  } catch {
    return null;
  }
}

export interface TokenExtraction {
  token: string | null;
  isCookie: boolean;
}

/**
 * Extract auth token and whether it originated from an HttpOnly cookie or Authorization header.
 */
export function extractTokenDetails(req: Request): TokenExtraction {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return { token: bearer, isCookie: false };
  }

  // 2. Check cookies (both parsed via cookie-parser and raw cookie header)
  const cookies = (req as any).cookies;
  if (cookies && cookies[AUTH_COOKIE_NAME]) {
    return { token: cookies[AUTH_COOKIE_NAME], isCookie: true };
  }

  // Fallback to raw cookie header parsing
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      return { token: decodeURIComponent(match[1]), isCookie: true };
    }
  }

  return { token: null, isCookie: false };
}

/**
 * Extract auth token from Authorization header (Bearer ...) or signed/plain cookies.
 */
export function extractToken(req: Request): string | null {
  return extractTokenDetails(req).token;
}

/**
 * Set the authentication cookie on the response.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear the authentication cookie.
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

