import { Router, Request, Response } from 'express';
import { verifyPassword, hashPassword } from '../utils/password';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';
import { rateLimitLogin, rateLimitPassword } from '../middleware/rateLimiter';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  extractToken,
  verifyToken,
  UserSessionPayload,
} from '../utils/jwt';

const router = Router();

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', rateLimitLogin, async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const rows = await sql`
      SELECT u.id, u.full_name, u.username, u.password_hash, u.is_active,
             u.must_change_password, hm.role, hm.household_id
      FROM   users u
      LEFT   JOIN household_members hm ON hm.user_id = u.id
      WHERE  u.username = ${username.toLowerCase().trim()}`;

    const user = rows[0];

    // Generic error — do not reveal whether the user exists
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Default household fallback if user does not have an explicit member entry yet
    let householdId = user.household_id;
    if (!householdId) {
      const defaultHh = await sql`SELECT id FROM households LIMIT 1`;
      householdId = defaultHh[0]?.id || 'c281ffa5-0c9b-4bff-9863-9b5bcee7f22c';
    }

    const sessionPayload: UserSessionPayload = {
      userId:             user.id,
      username:           user.username,
      fullName:           user.full_name,
      role:               user.role || 'member',
      householdId:        householdId,
      mustChangePassword: Boolean(user.must_change_password),
    };

    // Issue JWT token (stateless, 100% resilient on serverless / Vercel)
    const token = signToken(sessionPayload);
    setAuthCookie(res, token);

    const userPayload = {
      id:                 user.id,
      fullName:           user.full_name,
      username:           user.username,
      role:               user.role || 'member',
      householdId:        householdId,
      mustChangePassword: Boolean(user.must_change_password),
    };

    // Also populate express-session if active
    const session = (req as any).session;
    if (session) {
      Object.assign(session, sessionPayload);
      if (typeof session.save === 'function') {
        session.save(() => {});
      }
    }

    return res.json({
      success: true,
      token,
      user: userPayload,
      ...userPayload,
    });
  } catch (err: any) {
    console.error('[auth/login error]:', err?.message || err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Authentication service temporarily unavailable'
        : `Database/Server Error: ${err?.message || 'Unknown error'}`
    });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.clearCookie('connect.sid');
  res.clearCookie('auth_token');

  const session = (req as any).session;
  if (session && typeof session.destroy === 'function') {
    session.destroy(() => {});
  }
  res.json({ ok: true, success: true });
});

// ── GET /api/auth/session & /api/auth/me ──────────────────────────────────────
router.get(['/session', '/me'], (req: Request, res: Response) => {
  let session = (req as any).session;
  let token = extractToken(req);

  if ((!session || !session.userId) && token) {
    const payload = verifyToken(token);
    if (payload) {
      session = payload;
      (req as any).session = {
        ...payload,
        destroy: (cb?: any) => cb && cb(),
        save: (cb?: any) => cb && cb(),
      };
    }
  }

  if (!session?.userId) {
    return res.json({ authenticated: false });
  }

  const user = {
    id:                 session.userId,
    fullName:           session.fullName,
    username:           session.username,
    role:               session.role,
    householdId:        session.householdId,
    mustChangePassword: Boolean(session.mustChangePassword), // AUD-03
  };

  res.json({
    authenticated: true,
    token: token || undefined,
    user,
    ...user,
  });
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', requireAuth, rateLimitPassword, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.userId}`;
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(rows[0].password_hash, currentPassword);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await hashPassword(newPassword);
    await sql`
      UPDATE users
      SET    password_hash = ${hash}, must_change_password = FALSE, updated_at = NOW()
      WHERE  id = ${session.userId}`;

    session.mustChangePassword = false;

    // Issue updated token with mustChangePassword = false
    const updatedPayload: UserSessionPayload = {
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      householdId: session.householdId,
      mustChangePassword: false,
    };
    const newToken = signToken(updatedPayload);
    setAuthCookie(res, newToken);

    if (typeof session.save === 'function') {
      session.save(() => {});
    }

    res.json({ ok: true, success: true, token: newToken });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
