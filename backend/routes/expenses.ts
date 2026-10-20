import { Router, Request, Response } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import sql from '../db/index';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { audit } from '../utils/audit';
import { invalidateBalanceCache } from './balances';

const router = Router();
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve or automatically create a category by UUID or Name
 */
async function resolveCategoryId(categoryInput?: string | null): Promise<string | null> {
  if (!categoryInput) return null;
  const val = String(categoryInput).trim();
  if (!val) return null;

  if (UUID_REGEX.test(val)) {
    const rows = await sql`SELECT id FROM categories WHERE id = ${val}`;
    if (rows.length) return rows[0].id;
  }

  // Case-insensitive lookup by name
  const existing = await sql`
    SELECT id FROM categories WHERE LOWER(name) = LOWER(${val}) LIMIT 1`;
  if (existing.length) return existing[0].id;

  // Insert new category dynamically
  const newId = uuidv4();
  await sql`
    INSERT INTO categories (id, name, is_active)
    VALUES (${newId}, ${val.slice(0, 100)}, TRUE)`;
  return newId;
}

// ── GET /api/expenses ────────────────────────────────────────────────────────
// Query params: type (personal|common|all), from, to, page, limit (AUD-10)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { type, from, to, page, limit } = req.query;

  // Sanitize and bound pagination (AUD-10)
  const pageNum   = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum  = Math.min(1000, Math.max(1, parseInt(String(limit), 10) || 500));
  const offsetNum = (pageNum - 1) * limitNum;

  const validFrom = from && DATE_REGEX.test(String(from)) ? String(from) : null;
  const validTo   = to   && DATE_REGEX.test(String(to))   ? String(to)   : null;

  const minDate = validFrom || '1970-01-01';
  const maxDate = validTo   || '2099-12-31';

  const session = (req as any).session;
  const hid = session.householdId;
  const uid = session.userId;

  try {
    let rows: any[];

    if (type === 'personal') {
      rows = await sql`
        SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
        FROM   expenses e
        LEFT   JOIN users      u ON u.id = e.paid_by
        LEFT   JOIN categories c ON c.id = e.category_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type = 'personal'
          AND  e.paid_by      = ${uid}
          AND  e.is_deleted   = FALSE
          AND  e.expense_date >= ${minDate}
          AND  e.expense_date <= ${maxDate}
        ORDER  BY e.expense_date DESC, e.created_at DESC
        LIMIT  ${limitNum} OFFSET ${offsetNum}`;

    } else if (type === 'common') {
      rows = await sql`
        SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
        FROM   expenses e
        LEFT   JOIN users      u ON u.id = e.paid_by
        LEFT   JOIN categories c ON c.id = e.category_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type = 'common'
          AND  e.is_deleted   = FALSE
          AND  e.expense_date >= ${minDate}
          AND  e.expense_date <= ${maxDate}
        ORDER  BY e.expense_date DESC, e.created_at DESC
        LIMIT  ${limitNum} OFFSET ${offsetNum}`;

    } else {
      // All expenses the current user is authorized to view
      rows = await sql`
        SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
        FROM   expenses e
        LEFT   JOIN users      u ON u.id = e.paid_by
        LEFT   JOIN categories c ON c.id = e.category_id
        WHERE  e.household_id = ${hid}
          AND  e.is_deleted   = FALSE
          AND  e.expense_date >= ${minDate}
          AND  e.expense_date <= ${maxDate}
          AND  (
            e.paid_by = ${uid}
            OR e.expense_type = 'common'
            OR EXISTS (
              SELECT 1 FROM expense_shares es
              WHERE  es.expense_id = e.id AND es.user_id = ${uid}
            )
          )
        ORDER  BY e.expense_date DESC, e.created_at DESC
        LIMIT  ${limitNum} OFFSET ${offsetNum}`;
    }

    if (type === 'common' && rows.length > 0) {
      const expIds = rows.map((r: any) => r.id);
      const shareRows = await sql`
        SELECT es.*, u.full_name
        FROM   expense_shares es
        JOIN   users u ON u.id = es.user_id
        WHERE  es.expense_id = ANY(${expIds})`;
      const sharesByExp: Record<string, any[]> = {};
      for (const sh of shareRows) {
        if (!sharesByExp[sh.expense_id]) sharesByExp[sh.expense_id] = [];
        sharesByExp[sh.expense_id].push(sh);
      }
      rows = rows.map((r: any) => ({
        ...r,
        shares: sharesByExp[r.id] || [],
      }));
    }

    res.json(rows);
  } catch (err) {
    console.error('[expenses GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/expenses/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const session = (req as any).session;
  const uid = session.userId;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid expense ID' });
  }

  try {
    const rows = await sql`
      SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
      FROM   expenses e
      LEFT   JOIN users      u ON u.id = e.paid_by
      LEFT   JOIN categories c ON c.id = e.category_id
      WHERE  e.id = ${id} AND e.is_deleted = FALSE`;

    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const exp = rows[0];

    // Authorization check
    const isOwner  = exp.paid_by === uid;
    const isCommon = exp.expense_type === 'common';
    if (!isOwner && !isCommon) {
      const shareRows = await sql`
        SELECT 1 FROM expense_shares WHERE expense_id = ${id} AND user_id = ${uid}`;
      if (!shareRows.length) return res.status(403).json({ error: 'Access denied' });
    }

    const items = await sql`
      SELECT ei.*, c.name AS category_name
      FROM   expense_items ei
      LEFT   JOIN categories c ON c.id = ei.category_id
      WHERE  ei.expense_id = ${id}
      ORDER  BY ei.created_at`;

    const shares = await sql`
      SELECT es.*, u.full_name
      FROM   expense_shares es
      JOIN   users u ON u.id = es.user_id
      WHERE  es.expense_id = ${id}`;

    res.json({ ...exp, items, shares });
  } catch (err) {
    console.error('[expenses GET /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/expenses/personal ──────────────────────────────────────────────
router.post('/personal', requireAuth, async (req: Request, res: Response) => {
  const { description, amount_paise, category_id, expense_date, notes } = req.body;

  if (!description || !amount_paise || !expense_date) {
    return res.status(400).json({ error: 'description, amount_paise, and expense_date are required' });
  }
  if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1000000000) {
    return res.status(400).json({ error: 'amount_paise must be a valid positive integer' });
  }
  if (!DATE_REGEX.test(expense_date)) {
    return res.status(400).json({ error: 'Invalid expense_date format (YYYY-MM-DD required)' });
  }

  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;
  const eid = uuidv4();

  try {
    const resolvedCatId = await resolveCategoryId(category_id);

    await sql.transaction([
      sql`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, category_id, paid_by, expense_date, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'personal', ${description.trim().slice(0, 255)}, ${amount_paise},
           ${resolvedCatId}, ${uid}, ${expense_date}, ${notes ? notes.trim().slice(0, 1000) : null})`,
      sql`
        INSERT INTO expense_shares (id, expense_id, user_id, amount_paise, share_type)
        VALUES (${uuidv4()}, ${eid}, ${uid}, ${amount_paise}, 'personal')`,
    ]);

    await audit(uid, hid, 'expense', eid, 'create', null, { type: 'personal', amount_paise });
    invalidateBalanceCache(hid);

    res.status(201).json({ id: eid });
  } catch (err) {
    console.error('[expenses POST /personal]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/expenses/common  (admin only) ───────────────────────────────────
// Validates all inputs and participants up front before inserting (AUD-05)
router.post('/common', requireAdmin, async (req: Request, res: Response) => {
  const { description, amount_paise, category_id, expense_date, paid_by, split_method, notes, shares } = req.body;

  if (!description || !amount_paise || !expense_date || !paid_by || !split_method || !Array.isArray(shares)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1000000000) {
    return res.status(400).json({ error: 'amount_paise must be a valid positive integer' });
  }
  if (!DATE_REGEX.test(expense_date)) {
    return res.status(400).json({ error: 'Invalid expense_date format (YYYY-MM-DD required)' });
  }
  if (shares.length === 0) {
    return res.status(400).json({ error: 'At least one participant share is required' });
  }

  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;

  // 1. Fetch valid household members up front for validation (AUD-05)
  const householdMembers = await sql`
    SELECT user_id FROM household_members
    WHERE  household_id = ${hid} AND is_active = TRUE`;
  const validMemberIds = new Set(householdMembers.map((m: any) => m.user_id));

  if (!validMemberIds.has(paid_by)) {
    return res.status(400).json({ error: 'Paid-by member not found in this household' });
  }

  // 2. Validate all shares up front before performing any database write
  let shareTotal = 0;
  for (const sh of shares) {
    if (!sh.user_id || !validMemberIds.has(sh.user_id)) {
      return res.status(400).json({ error: 'Invalid participant member in shares list' });
    }
    if (!Number.isInteger(sh.amount_paise) || sh.amount_paise <= 0) {
      return res.status(400).json({ error: 'Each share amount_paise must be a positive integer' });
    }
    shareTotal += sh.amount_paise;
  }

  if (shareTotal !== amount_paise) {
    return res.status(400).json({
      error: `Share total (${shareTotal} paise) must equal expense amount (${amount_paise} paise)`,
    });
  }

  const eid = uuidv4();

  try {
    const resolvedCatId = await resolveCategoryId(category_id);

    const transactionQueries = [
      sql`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, category_id,
           paid_by, expense_date, split_method, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'common', ${description.trim().slice(0, 255)}, ${amount_paise}, ${resolvedCatId},
           ${paid_by}, ${expense_date}, ${split_method}, ${notes ? notes.trim().slice(0, 1000) : null})`,
      ...shares.map((sh: any) =>
        sql`
          INSERT INTO expense_shares (id, expense_id, user_id, amount_paise, share_type)
          VALUES (${uuidv4()}, ${eid}, ${sh.user_id}, ${sh.amount_paise}, 'common')`
      ),
    ];

    await sql.transaction(transactionQueries);

    await audit(uid, hid, 'expense', eid, 'create', null, { type: 'common', amount_paise, split_method });
    invalidateBalanceCache(hid);

    res.status(201).json({ id: eid });
  } catch (err) {
    console.error('[expenses POST /common]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/expenses/on-behalf ─────────────────────────────────────────────
router.post('/on-behalf', requireAuth, async (req: Request, res: Response) => {
  const { description, expense_date, notes, items } = req.body;

  if (!description || !expense_date) {
    return res.status(400).json({ error: 'description and expense_date are required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;

  const householdMembers = await sql`
    SELECT user_id FROM household_members
    WHERE  household_id = ${hid} AND is_active = TRUE`;
  const validMemberIds = new Set(householdMembers.map((m: any) => m.user_id));

  let totalPaise = 0;
  for (const item of items) {
    if (!item.description || !item.beneficiary_id) {
      return res.status(400).json({ error: 'Each item needs a description and beneficiary_id' });
    }
    if (!UUID_REGEX.test(item.beneficiary_id) || !validMemberIds.has(item.beneficiary_id)) {
      return res.status(400).json({ error: 'Beneficiary must be an active member of this household' });
    }
    if (!Number.isInteger(item.amount_paise) || item.amount_paise <= 0 || item.amount_paise > 1000000000) {
      return res.status(400).json({ error: 'Each item amount_paise must be a positive integer within valid limits' });
    }
    totalPaise += item.amount_paise;
  }

  const eid = uuidv4();

  try {
    const itemQueries: any[] = [];
    for (const item of items) {
      const iid = uuidv4();
      const resolvedCatId = await resolveCategoryId(item.category_id || item.category);

      itemQueries.push(
        sql`
          INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
          VALUES (${iid}, ${eid}, ${item.description.trim().slice(0, 255)}, ${item.amount_paise}, ${resolvedCatId})`,
        sql`
          INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
          VALUES (${uuidv4()}, ${eid}, ${iid}, ${item.beneficiary_id}, ${item.amount_paise}, 'on_behalf')`
      );
    }

    await sql.transaction([
      sql`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'on_behalf', ${description.trim().slice(0, 255)}, ${totalPaise}, ${uid}, ${expense_date}, ${notes ? notes.trim().slice(0, 1000) : null})`,
      ...itemQueries,
    ]);

    await audit(uid, hid, 'expense', eid, 'create', null, {
      type: 'on_behalf', amount_paise: totalPaise, item_count: items.length,
    });
    invalidateBalanceCache(hid);

    res.status(201).json({ id: eid });
  } catch (err) {
    console.error('[expenses POST /on-behalf]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/expenses/:id  (soft delete) ──────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;
  const isAdmin = session.role === 'admin';

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid expense ID' });
  }

  try {
    const rows = await sql`
      SELECT * FROM expenses WHERE id = ${id} AND household_id = ${hid} AND is_deleted = FALSE`;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const exp = rows[0];

    // Authorization check
    if (exp.expense_type === 'personal') {
      if (exp.paid_by !== uid) return res.status(403).json({ error: 'You can only delete your own personal expenses' });
    } else if (exp.expense_type === 'common') {
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can delete common expenses' });
    } else {
      if (exp.paid_by !== uid && !isAdmin) return res.status(403).json({ error: 'Unauthorized to delete this purchase' });
    }

    // Block deletion if any confirmed settlement references a share of this expense
    const settled = await sql`
      SELECT 1 FROM settlements s
      JOIN   expense_shares es ON es.id = s.expense_share_id
      WHERE  es.expense_id = ${id} AND s.status = 'confirmed'`;
    if (settled.length) {
      return res.status(409).json({ error: 'Cannot delete: this expense has confirmed settlements' });
    }

    await sql`UPDATE expenses SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${id}`;
    await audit(uid, hid, 'expense', id, 'delete', { amount_paise: exp.amount_paise }, null);
    invalidateBalanceCache(hid);

    res.json({ ok: true });
  } catch (err) {
    console.error('[expenses DELETE /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
