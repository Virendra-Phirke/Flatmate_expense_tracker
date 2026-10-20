import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';
const rawSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (isProd && !rawSecret) {
  throw new Error('FATAL SECURITY CONFIGURATION: JWT_SECRET or SESSION_SECRET environment variable is required in production.');
}
const JWT_SECRET = rawSecret || 'flatmate_expense_jwt_dev_secret_only';
export const AUTH_COOKIE_NAME = 'auth_token';

export interface UserSessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: 'admin' | 'member';
  householdId: string;
  householdName?: string;
  mustChangePassword?: boolean;
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

/**
 * Extract auth token from Authorization header (Bearer ...) or signed/plain cookies.
 */
export function extractToken(req: Request): string | null {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  // 2. Check cookies (both parsed via cookie-parser and raw cookie header)
  const cookies = (req as any).cookies;
  if (cookies && cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }

  // Fallback to raw cookie header parsing
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
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
