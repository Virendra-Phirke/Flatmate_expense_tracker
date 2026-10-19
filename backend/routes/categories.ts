import { Router, Request, Response } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

let categoriesCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateCategoriesCache() {
  categoriesCache = null;
}

// ── GET /api/categories ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.timestamp < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json(categoriesCache.data);
  }

  try {
    const rows = await sql`
      SELECT id, name, expense_type
      FROM   categories
      WHERE  is_active = TRUE
      ORDER  BY name`;
    categoriesCache = { data: rows, timestamp: now };
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(rows);
  } catch (err) {
    console.error('[categories GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/categories ─────────────────────────────────────────────────────
// Create a new category or return existing if name matches case-insensitively
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name, expense_type } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmed = name.trim().slice(0, 100);

  try {
    const existing = await sql`
      SELECT id, name, expense_type
      FROM   categories
      WHERE  LOWER(name) = LOWER(${trimmed})
      LIMIT  1`;

    if (existing.length) {
      return res.json(existing[0]);
    }

    const id = uuidv4();
    await sql`
      INSERT INTO categories (id, name, expense_type, is_active)
      VALUES (${id}, ${trimmed}, ${expense_type || null}, TRUE)`;

    invalidateCategoriesCache();
    res.status(201).json({ id, name: trimmed, expense_type: expense_type || null });
  } catch (err) {
    console.error('[categories POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
