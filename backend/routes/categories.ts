import { Router, Request, Response } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Per-household category cache with 5-minute TTL
const householdCategoryCaches = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateCategoriesCache(householdId?: string) {
  if (householdId) {
    householdCategoryCaches.delete(householdId);
  } else {
    householdCategoryCaches.clear();
  }
}

// ── GET /api/categories ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const hid = session?.householdId || 'default';
  const now = Date.now();

  const cached = householdCategoryCaches.get(hid);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json(cached.data);
  }

  try {
    const rows = await sql`
      SELECT id, name, expense_type, household_id
      FROM   categories
      WHERE  is_active = TRUE
        AND  (household_id = ${hid} OR household_id IS NULL)
      ORDER  BY name`;

    householdCategoryCaches.set(hid, { data: rows, timestamp: now });
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(rows);
  } catch (err) {
    console.error('[categories GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/categories ─────────────────────────────────────────────────────
// Create a new household-scoped category or return existing if name matches case-insensitively
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const hid = session?.householdId;
  const { name, expense_type } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmed = name.trim().slice(0, 100);

  try {
    const existing = await sql`
      SELECT id, name, expense_type, household_id
      FROM   categories
      WHERE  LOWER(name) = LOWER(${trimmed})
        AND  (household_id = ${hid} OR household_id IS NULL)
      LIMIT  1`;

    if (existing.length) {
      return res.json(existing[0]);
    }

    const id = uuidv4();
    await sql`
      INSERT INTO categories (id, household_id, name, expense_type, is_active)
      VALUES (${id}, ${hid || null}, ${trimmed}, ${expense_type || null}, TRUE)`;

    invalidateCategoriesCache(hid);
    res.status(201).json({ id, name: trimmed, expense_type: expense_type || null, household_id: hid });
  } catch (err) {
    console.error('[categories POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
