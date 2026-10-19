import { Router, Request, Response } from 'express';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

const membersCache: Record<string, { data: any[]; timestamp: number }> = {};
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function invalidateMembersCache(householdId?: string) {
  if (householdId) delete membersCache[householdId];
  else Object.keys(membersCache).forEach((k) => delete membersCache[k]);
}

// ── GET /api/members ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const hid = session.householdId;
  const now = Date.now();

  const cached = membersCache[hid];
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json(cached.data);
  }

  try {
    const rows = await sql`
      SELECT u.id, u.full_name, u.username, hm.role, u.is_active
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  hm.household_id = ${hid}
        AND  hm.is_active = TRUE
      ORDER  BY u.full_name`;

    membersCache[hid] = { data: rows, timestamp: now };
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(rows);
  } catch (err) {
    console.error('[members]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
