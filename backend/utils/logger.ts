/**
 * Structured logger with recursive secret redaction
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'authtoken',
  'auth_token',
  'authorization',
  'cookie',
  'devicetoken',
  'device_token',
  'secret',
  'jwt_secret',
  'session_secret',
  'credential',
  'apikey',
  'gemini_api_key',
  'creditcard',
  'cardnumber',
  'cvv',
  'pin',
]);

export function redactSensitive(obj: any, depth = 0): any {
  if (depth > 6 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Redact Bearer tokens in strings
    if (obj.startsWith('Bearer ')) return 'Bearer [REDACTED]';
    return obj;
  }
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactSensitive(val, depth + 1);
    }
  }
  return sanitized;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  householdId?: string;
  route?: string;
  durationMs?: number;
  status?: number;
  [key: string]: any;
}

export const logger = {
  info(message: string, meta: Record<string, any> = {}) {
    logger.log('info', message, meta);
  },
  warn(message: string, meta: Record<string, any> = {}) {
    logger.log('warn', message, meta);
  },
  error(message: string, meta: Record<string, any> = {}) {
    logger.log('error', message, meta);
  },
  debug(message: string, meta: Record<string, any> = {}) {
    if (process.env.NODE_ENV !== 'production') {
      logger.log('debug', message, meta);
    }
  },
  log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...redactSensitive(meta),
    };

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      // JSON format for cloud log ingestion
      const output = JSON.stringify(entry);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      // Human-readable format for local development
      const reqTag = entry.requestId ? `[${entry.requestId.slice(0, 8)}]` : '';
      const prefix = `[${entry.timestamp.slice(11, 19)}] ${entry.level.toUpperCase()} ${reqTag} ${message}`;
      if (level === 'error') {
        console.error(prefix, Object.keys(meta).length ? redactSensitive(meta) : '');
      } else if (level === 'warn') {
        console.warn(prefix, Object.keys(meta).length ? redactSensitive(meta) : '');
      } else {
        console.log(prefix, Object.keys(meta).length ? redactSensitive(meta) : '');
      }
    }
  },
};

export default logger;
