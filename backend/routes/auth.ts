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
  signBiometricDeviceToken,
  verifyBiometricDeviceToken,
  UserSessionPayload,
} from '../utils/jwt';
import { generateCsrfToken, setCsrfCookie, CSRF_COOKIE_NAME } from '../utils/csrf';
import {
  createWebAuthnChallenge,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '../utils/webauthn';

const router = Router();

// ── GET /api/auth/csrf ───────────────────────────────────────────────────────
router.get('/csrf', (req: Request, res: Response) => {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const csrfToken = generateCsrfToken(session.userId);
  setCsrfCookie(res, csrfToken);
  res.json({ csrfToken });
});

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

    // Issue bound CSRF token
    const csrfToken = generateCsrfToken(user.id);
    setCsrfCookie(res, csrfToken);

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
      csrfToken,
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

// ── POST /api/auth/biometric-enroll ──────────────────────────────────────────
// Securely registers a device for biometric unlock. Requires active authenticated session.
router.post('/biometric-enroll', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { credentialId } = req.body;

  try {
    const deviceToken = signBiometricDeviceToken({
      userId: session.userId,
      username: session.username,
      householdId: session.householdId,
      credentialId: credentialId ? String(credentialId) : undefined,
    });

    res.json({
      success: true,
      deviceToken,
      message: 'Biometric device token issued successfully',
    });
  } catch (err: any) {
    console.error('[auth/biometric-enroll error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to issue biometric device token' });
  }
});

// ── POST /api/auth/biometric-login ───────────────────────────────────────────
// Authenticates user via biometric unlock. Requires enrolled deviceToken.
router.post('/biometric-login', rateLimitLogin, async (req: Request, res: Response) => {
  const { username, credentialId, deviceToken } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required for biometric authentication' });
  }
  if (!deviceToken) {
    return res.status(401).json({
      error: 'Device not enrolled for biometric unlock. Please sign in with your password first.',
    });
  }

  // Cryptographically verify device-bound enrollment token
  const devicePayload = verifyBiometricDeviceToken(deviceToken);
  if (!devicePayload) {
    return res.status(401).json({
      error: 'Biometric authorization token is invalid or expired. Please sign in with your password.',
    });
  }

  try {
    const rows = await sql`
      SELECT u.id, u.full_name, u.username, u.is_active,
             u.must_change_password, hm.role, hm.household_id
      FROM   users u
      LEFT   JOIN household_members hm ON hm.user_id = u.id
      WHERE  u.username = ${username.toLowerCase().trim()}`;

    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User account not found or disabled' });
    }

    // Verify token matches the intended user
    if (devicePayload.userId !== user.id || devicePayload.username.toLowerCase() !== user.username.toLowerCase()) {
      return res.status(401).json({
        error: 'Biometric device token does not match the requested username',
      });
    }

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

    const token = signToken(sessionPayload);
    setAuthCookie(res, token);

    const csrfToken = generateCsrfToken(user.id);
    setCsrfCookie(res, csrfToken);

    const userPayload = {
      id:                 user.id,
      fullName:           user.full_name,
      username:           user.username,
      role:               user.role || 'member',
      householdId:        householdId,
      mustChangePassword: Boolean(user.must_change_password),
    };

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
      csrfToken,
      user: userPayload,
      ...userPayload,
    });
  } catch (err: any) {
    console.error('[auth/biometric-login error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to process biometric login' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.clearCookie('connect.sid');
  res.clearCookie('auth_token');
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });

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

  const csrfToken = generateCsrfToken(session.userId);
  setCsrfCookie(res, csrfToken);

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
    csrfToken,
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

    const csrfToken = generateCsrfToken(session.userId);
    setCsrfCookie(res, csrfToken);

    if (typeof session.save === 'function') {
      session.save(() => {});
    }

    res.json({ ok: true, success: true, token: newToken, csrfToken });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── WEBAUTHN FIDO2 PLATFORM BIOMETRICS (Phase 2) ─────────────────────────────

// 1. Generate registration challenge for authenticated user
router.post('/webauthn/register-options', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  try {
    const challenge = await createWebAuthnChallenge('registration', session.userId);
    res.json({
      challenge,
      rp: {
        name: 'Flatmate Expense Manager',
        id: req.hostname === 'localhost' ? 'localhost' : req.hostname,
      },
      user: {
        id: session.userId,
        name: session.username,
        displayName: session.fullName || session.username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
    });
  } catch (err: any) {
    console.error('[webauthn/register-options error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate WebAuthn registration options' });
  }
});

// 2. Verify registration response and store public key credential
router.post('/webauthn/register-verify', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { expectedChallenge, clientDataJSON, credentialId, publicKey, deviceName, transports } = req.body;

  if (!expectedChallenge || !clientDataJSON || !credentialId || !publicKey) {
    return res.status(400).json({ error: 'Missing required WebAuthn registration parameters' });
  }

  try {
    const record = await verifyRegistrationResponse({
      userId: session.userId,
      expectedChallenge,
      clientDataJSON,
      credentialId,
      publicKey,
      deviceName,
      transports,
    });

    res.json({
      success: true,
      credentialRecordId: record.id,
      credentialId: record.credentialId,
      message: 'Biometric passkey registered successfully',
    });
  } catch (err: any) {
    console.error('[webauthn/register-verify error]:', err?.message || err);
    res.status(400).json({ error: err?.message || 'Failed to verify WebAuthn registration' });
  }
});

// 3. Generate authentication challenge for biometric login
router.post('/webauthn/login-options', async (req: Request, res: Response) => {
  try {
    const challenge = await createWebAuthnChallenge('authentication');
    res.json({
      challenge,
      timeout: 60000,
      userVerification: 'preferred',
    });
  } catch (err: any) {
    console.error('[webauthn/login-options error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate WebAuthn login options' });
  }
});

// 4. Verify authentication assertion and issue authenticated session
router.post('/webauthn/login-verify', rateLimitLogin, async (req: Request, res: Response) => {
  const { credentialId, expectedChallenge, clientDataJSON, authenticatorData, signature } = req.body;

  if (!credentialId || !expectedChallenge || !clientDataJSON || !authenticatorData || !signature) {
    return res.status(400).json({ error: 'Missing required WebAuthn assertion fields' });
  }

  try {
    const { userId } = await verifyAuthenticationResponse({
      credentialId,
      expectedChallenge,
      clientDataJSON,
      authenticatorData,
      signature,
    });

    const rows = await sql`
      SELECT u.id, u.full_name, u.username, u.is_active,
             u.must_change_password, hm.role, hm.household_id
      FROM   users u
      LEFT   JOIN household_members hm ON hm.user_id = u.id
      WHERE  u.id = ${userId}`;

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User account disabled or not found' });
    }

    let householdId = user.household_id;
    if (!householdId) {
      const defaultHh = await sql`SELECT id FROM households LIMIT 1`;
      householdId = defaultHh[0]?.id || 'c281ffa5-0c9b-4bff-9863-9b5bcee7f22c';
    }

    const sessionPayload: UserSessionPayload = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role || 'member',
      householdId: householdId,
      mustChangePassword: Boolean(user.must_change_password),
    };

    const token = signToken(sessionPayload);
    setAuthCookie(res, token);

    const csrfToken = generateCsrfToken(user.id);
    setCsrfCookie(res, csrfToken);

    const userPayload = {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role || 'member',
      householdId: householdId,
      mustChangePassword: Boolean(user.must_change_password),
    };

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
      csrfToken,
      user: userPayload,
      ...userPayload,
    });
  } catch (err: any) {
    console.error('[webauthn/login-verify error]:', err?.message || err);
    res.status(401).json({ error: err?.message || 'Biometric authentication failed' });
  }
});

// 5. List user's registered devices
router.get('/webauthn/devices', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  try {
    const devices = await sql`
      SELECT id, credential_id, device_name, is_revoked, last_used_at, created_at
      FROM webauthn_credentials
      WHERE user_id = ${session.userId}
      ORDER BY created_at DESC
    `;
    res.json(devices);
  } catch (err: any) {
    console.error('[webauthn/devices GET error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve registered devices' });
  }
});

// 6. Revoke a registered device
router.delete('/webauthn/devices/:id', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { id } = req.params;
  try {
    const result = await sql`
      UPDATE webauthn_credentials
      SET is_revoked = TRUE
      WHERE id = ${id} AND user_id = ${session.userId}
      RETURNING id
    `;
    if (!result.length) {
      return res.status(404).json({ error: 'Device credential not found' });
    }
    res.json({ ok: true, success: true, message: 'Device credential revoked' });
  } catch (err: any) {
    console.error('[webauthn/devices DELETE error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

export default router;
