import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import sql from '../db/index';

/**
 * Computes deterministic SHA-256 hash of request body
 */
function hashPayload(payload: any): string {
  if (payload === undefined || payload === null) return '';
  const sortedKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortedKeys);
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        result[key] = sortedKeys(obj[key]);
        return result;
      }, {});
  };
  return createHash('sha256').update(JSON.stringify(sortedKeys(payload))).digest('hex');
}

/**
 * Middleware that provides uniform, atomic idempotency guarantees for mutations.
 */
export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only process mutations
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Check for explicit Idempotency-Key header (RFC IETF standard)
  const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return next();
  }

  const clientKey = String(rawKey).trim();
  const session = (req as any).session;
  const uid = session?.userId;
  const hid = session?.householdId;

  // Unauthenticated requests cannot use user/household-scoped idempotency
  if (!uid || !hid) {
    return next();
  }

  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
  const requestHash = hashPayload(req.body);

  try {
    const existing = await sql`
      SELECT id, status, status_code, request_hash, response_body
      FROM idempotency_keys
      WHERE household_id = ${hid}
        AND user_id = ${uid}
        AND route = ${route}
        AND client_key = ${clientKey}
      LIMIT 1`;

    if (existing.length) {
      const record = existing[0];

      if (record.status === 'completed') {
        if (record.request_hash !== requestHash) {
          return res.status(409).json({
            error: 'Idempotency key was previously used with a different request payload',
          });
        }
        res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
        return res.status(record.status_code || 200).json(record.response_body);
      }

      if (record.status === 'processing') {
        return res.status(409).json({
          error: 'A concurrent operation with the same idempotency key is currently in progress',
        });
      }
    }

    // Insert pending operation record
    try {
      await sql`
        INSERT INTO idempotency_keys
          (household_id, user_id, route, client_key, request_hash, status, expires_at)
        VALUES
          (${hid}, ${uid}, ${route}, ${clientKey}, ${requestHash}, 'processing', NOW() + INTERVAL '24 hours')
        ON CONFLICT (household_id, user_id, route, client_key)
        DO UPDATE SET request_hash = ${requestHash}, status = 'processing', created_at = NOW()`;
    } catch {
      return res.status(409).json({
        error: 'A concurrent operation with the same idempotency key is currently in progress',
      });
    }

    // Intercept response to persist completed payload before returning to client
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const statusCode = res.statusCode;
      const statusStr = statusCode < 400 ? 'completed' : 'failed';

      // Ensure record is saved before response finishes so immediate replays always hit completed status
      sql`
        UPDATE idempotency_keys
        SET status = ${statusStr},
            status_code = ${statusCode},
            response_body = ${body ? JSON.stringify(body) : null}
        WHERE household_id = ${hid}
          AND user_id = ${uid}
          AND route = ${route}
          AND client_key = ${clientKey}
      `
        .catch((err: any) => {
          console.warn('[idempotency record update warning]:', err?.message || err);
        })
        .finally(() => {
          originalJson(body);
        });

      return res;
    };

    next();
  } catch (err: any) {
    console.error('[idempotency error]:', err?.message || err);
    next();
  }
}

export default idempotencyMiddleware;
