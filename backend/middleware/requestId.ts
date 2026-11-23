import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

/**
 * Attaches unique Request ID and logs request start & finish with latency and status.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-request-id'];
  const reqId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : randomUUID();
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);

  res.on('finish', () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const session = (req as any).session;

    const logMeta = {
      requestId: reqId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      userId: session?.userId,
      householdId: session?.householdId,
    };

    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${durationMs}ms)`, logMeta);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${durationMs}ms)`, logMeta);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${durationMs}ms)`, logMeta);
    }
  });

  next();
}

export default requestIdMiddleware;
