import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { extractToken, verifyToken, UserSessionPayload } from '../utils/jwt';

/**
 * Ensure req.session and req.user are populated with session data and safe stub methods.
 */
export function populateSession(req: Request, payload?: UserSessionPayload | null) {
  const safeSession: any = (req as any).session || {};

  if (payload) {
    Object.assign(safeSession, payload);
    (req as any).user = payload;
  }

  // Ensure stub methods exist so legacy session code doesn't throw
  if (typeof safeSession.destroy !== 'function') {
    safeSession.destroy = (cb?: any) => { if (typeof cb === 'function') cb(); };
  }
  if (typeof safeSession.save !== 'function') {
    safeSession.save = (cb?: any) => { if (typeof cb === 'function') cb(); };
  }
  if (typeof safeSession.touch !== 'function') {
    safeSession.touch = () => {};
  }
  if (typeof safeSession.reload !== 'function') {
    safeSession.reload = (cb?: any) => { if (typeof cb === 'function') cb(); };
  }
  if (typeof safeSession.regenerate !== 'function') {
    safeSession.regenerate = (cb?: any) => { if (typeof cb === 'function') cb(); };
  }

  (req as any).session = safeSession;
  return safeSession;
}

/**
 * Middleware that extracts and verifies JWT token from Authorization header or cookies,
 * populating req.user and req.session for seamless compatibility.
 */
export function authContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  let session = (req as any).session;
  if (session && session.userId) {
    populateSession(req);
    return next();
  }

  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      populateSession(req, payload);
      return next();
    }
  }

  populateSession(req, null);
  next();
}

/**
 * Require a valid, active, authenticated session.
 * Blocks all operations except password change if mustChangePassword is true. (AUD-03, AUD-06)
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  let session = (req as any).session;

  if (!session || !session.userId) {
    const token = extractToken(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        session = populateSession(req, payload);
      }
    }
  }

  if (!session || !session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // If user must change password, restrict mutating operations until password is changed
  if (session.mustChangePassword) {
    const isAllowedAuthPath =
      (req.baseUrl === '/api/auth' || req.baseUrl === '/auth') &&
      ['/change-password', '/logout', '/session', '/me'].includes(req.path);

    if (!isAllowedAuthPath && req.method !== 'GET') {
      return res.status(403).json({
        error: 'Password change required before performing actions',
        mustChangePassword: true,
      });
    }
  }

  // For write requests (POST, PUT, DELETE), verify user account is still active in DB (AUD-06)
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    try {
      const rows = await sql`
        SELECT u.is_active, hm.is_active AS member_active
        FROM   users u
        JOIN   household_members hm ON hm.user_id = u.id AND hm.household_id = ${session.householdId}
        WHERE  u.id = ${session.userId}`;

      if (!rows.length || !rows[0].is_active || !rows[0].member_active) {
        if (typeof session.destroy === 'function') {
          session.destroy(() => {});
        }
        return res.status(403).json({ error: 'Account has been deactivated' });
      }
    } catch (err) {
      console.error('[auth guard check error]:', err);
      return res.status(500).json({ error: 'Database error validating session activity status' });
    }
  }

  next();
}

/**
 * Require the authenticated user to be an admin in their household.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    const session = (req as any).session;
    if (session?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

export default { authContextMiddleware, requireAuth, requireAdmin };
