/**
 * Environment configuration and startup validation
 */

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
  ALLOWED_ORIGINS: string[];
  COOKIE_AUTH_ENABLED: boolean;
  GEMINI_API_KEY?: string;
}

let validatedEnv: AppEnv | null = null;

export function validateEnv(): AppEnv {
  if (validatedEnv) return validatedEnv;

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isProd = nodeEnv === 'production';

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !process.env.TEST_EPHEMERAL_DB) {
    if (isProd) {
      throw new Error('FATAL CONFIGURATION ERROR: DATABASE_URL environment variable is required in production.');
    } else {
      console.warn('[config warning]: DATABASE_URL is not set. Database operations will fail.');
    }
  }

  // Canonicalize JWT_SECRET and SESSION_SECRET
  const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (isProd && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET or SESSION_SECRET must be at least 32 characters in production.');
  }

  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://flatmate-expense-tracker-lemon.vercel.app',
  ];

  if (process.env.FRONTEND_URL) {
    defaultOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/$/, ''));
  }

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...rawAllowedOrigins]));

  validatedEnv = {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: databaseUrl || '',
    JWT_SECRET: jwtSecret || 'flatmate_expense_jwt_dev_secret_only',
    FRONTEND_URL: process.env.FRONTEND_URL?.trim().replace(/\/$/, ''),
    ALLOWED_ORIGINS: allowedOrigins,
    COOKIE_AUTH_ENABLED: process.env.COOKIE_AUTH_ENABLED !== 'false',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  return validatedEnv;
}

export const env = validateEnv();
export default env;
