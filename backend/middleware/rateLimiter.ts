import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const loginLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
const passwordLimiter = new RateLimiterMemory({ points: 10, duration: 900 });
const claimLimiter = new RateLimiterMemory({ points: 30, duration: 60 });
const upiLimiter = new RateLimiterMemory({ points: 30, duration: 60 });
const aiLimiter = new RateLimiterMemory({ points: 15, duration: 60 });

/**
 * Rate-limit login attempts by client IP (10 attempts / min).
 */
export async function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  try {
    await loginLimiter.consume(req.ip || 'unknown');
    next();
  } catch {
    res.status(429).json({ error: 'Too many login attempts. Please wait a minute and try again.' });
  }
}

/**
 * Rate-limit password change attempts (10 attempts / 15 mins).
 */
export async function rateLimitPassword(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await passwordLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many password change attempts. Please wait 15 minutes before trying again.' });
  }
}

/**
 * Rate-limit payment claim submissions by user ID.
 */
export async function rateLimitClaim(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await claimLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many payment claims. Try again later.' });
  }
}

/**
 * Rate-limit UPI profile updates by user ID.
 */
export async function rateLimitUpi(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await upiLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many UPI profile updates. Try again later.' });
  }
}

/**
 * Rate-limit AI voice expense parser requests (15 requests / min).
 */
export async function rateLimitAI(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await aiLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many AI requests. Please slow down and try again in a moment.' });
  }
}

export default { rateLimitLogin, rateLimitPassword, rateLimitClaim, rateLimitUpi, rateLimitAI };
