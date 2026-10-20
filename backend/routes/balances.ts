import { Router, Request, Response } from 'express';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';
import { invalidateAnalyticsCache } from './analytics';

const router = Router();

const balanceCache = new Map<string, { data: any; timestamp: number }>();
const BALANCE_CACHE_TTL_MS = 15 * 1000; // 15 seconds

export function invalidateBalanceCache(householdId?: string) {
  if (householdId) {
    for (const key of balanceCache.keys()) {
      if (key.startsWith(`${householdId}:`)) {
        balanceCache.delete(key);
      }
    }
  } else {
    balanceCache.clear();
  }
  // Also invalidate analytics cache whenever expenses or balances mutate
  try {
    invalidateAnalyticsCache(householdId);
  } catch {}
}

// ── GET /api/balances & /api/balances/summary ────────────────────────────────
// Computes canonical household balances across personal, common, and on-behalf expenses (AUD-01)
router.get(['/', '/summary'], requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;

  const cacheKey = `${hid}:${uid}`;
  const now = Date.now();
  const cached = balanceCache.get(cacheKey);
  if (cached && (now - cached.timestamp < BALANCE_CACHE_TTL_MS)) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=15');
    return res.json(cached.data);
  }

  try {
    // Execute a single consolidated SQL query to minimize round-trip network latency to Neon
    const [row] = await sql`
      SELECT
        (SELECT json_build_object(
          'personal_spending', (SELECT COALESCE(SUM(amount_paise), 0) FROM expenses WHERE household_id = ${hid} AND expense_type = 'personal' AND paid_by = ${uid} AND is_deleted = FALSE),
          'common_share', (SELECT COALESCE(SUM(es.amount_paise), 0) FROM expense_shares es JOIN expenses e ON e.id = es.expense_id WHERE e.household_id = ${hid} AND e.expense_type = 'common' AND es.user_id = ${uid} AND e.is_deleted = FALSE),
          'common_paid', (SELECT COALESCE(SUM(amount_paise), 0) FROM expenses WHERE household_id = ${hid} AND expense_type = 'common' AND paid_by = ${uid} AND is_deleted = FALSE),
          'advanced_for_others', (SELECT COALESCE(SUM(es.amount_paise), 0) FROM expense_shares es JOIN expenses e ON e.id = es.expense_id WHERE e.household_id = ${hid} AND e.expense_type IN ('on_behalf', 'common') AND e.paid_by = ${uid} AND es.user_id != ${uid} AND e.is_deleted = FALSE)
        )) AS totals,

        (SELECT COALESCE(json_agg(json_build_object('id', u.id, 'full_name', u.full_name)), '[]'::json)
         FROM users u
         JOIN household_members hm ON hm.user_id = u.id
         WHERE hm.household_id = ${hid} AND hm.is_active = TRUE AND u.id != ${uid}
        ) AS roommates,

        (SELECT COALESCE(json_agg(json_build_object('debtor_id', sub.user_id, 'debtor_name', sub.full_name, 'gross_owed', sub.gross_owed)), '[]'::json)
         FROM (
           SELECT es.user_id, u.full_name, COALESCE(SUM(es.amount_paise), 0) AS gross_owed
           FROM expense_shares es
           JOIN expenses e ON e.id = es.expense_id
           JOIN users u ON u.id = es.user_id
           WHERE e.household_id = ${hid} AND e.expense_type IN ('on_behalf', 'common') AND e.paid_by = ${uid} AND es.user_id != ${uid} AND e.is_deleted = FALSE
           GROUP BY es.user_id, u.full_name
         ) sub
        ) AS they_owe,

        (SELECT COALESCE(json_agg(json_build_object('creditor_id', sub.creditor_id, 'creditor_name', sub.creditor_name, 'gross_owe', sub.gross_owe)), '[]'::json)
         FROM (
           SELECT e.paid_by AS creditor_id, u.full_name AS creditor_name, COALESCE(SUM(es.amount_paise), 0) AS gross_owe
           FROM expense_shares es
           JOIN expenses e ON e.id = es.expense_id
           JOIN users u ON u.id = e.paid_by
           WHERE e.household_id = ${hid} AND e.expense_type IN ('on_behalf', 'common') AND e.paid_by != ${uid} AND es.user_id = ${uid} AND e.is_deleted = FALSE
           GROUP BY e.paid_by, u.full_name
         ) sub
        ) AS my_debts,

        (SELECT COALESCE(json_agg(json_build_object('peer_id', sub.peer_id, 'direction', sub.direction, 'confirmed_paid', sub.confirmed_paid)), '[]'::json)
         FROM (
           SELECT
             CASE WHEN recipient_id = ${uid} THEN payer_id ELSE recipient_id END AS peer_id,
             CASE WHEN recipient_id = ${uid} THEN 'received' ELSE 'paid' END AS direction,
             COALESCE(SUM(amount_paise), 0) AS confirmed_paid
           FROM settlements
           WHERE household_id = ${hid} AND status = 'confirmed' AND (recipient_id = ${uid} OR payer_id = ${uid})
           GROUP BY peer_id, direction
         ) sub
        ) AS settlements
    `;

    const totalsRow = row?.totals || {};
    const roommates = row?.roommates || [];
    const theyOweRows = row?.they_owe || [];
    const myDebtRows = row?.my_debts || [];
    const settlementRows = row?.settlements || [];

    const peerNames = new Map<string, string>();
    for (const m of (roommates || [])) peerNames.set(m.id, m.full_name);
    for (const r of (theyOweRows || [])) peerNames.set(r.debtor_id, r.debtor_name);
    for (const r of (myDebtRows || [])) peerNames.set(r.creditor_id, r.creditor_name);

    const theyOweMap: Record<string, number> = Object.fromEntries(
      (theyOweRows || []).map((r: any) => [r.debtor_id, parseInt(r.gross_owed || 0, 10)])
    );

    const myDebtMap: Record<string, number> = Object.fromEntries(
      (myDebtRows || []).map((r: any) => [r.creditor_id, parseInt(r.gross_owe || 0, 10)])
    );

    const receivedMap: Record<string, number> = {};
    const paidMap: Record<string, number> = {};
    for (const s of (settlementRows || [])) {
      const amt = parseInt(s.confirmed_paid || 0, 10);
      if (s.direction === 'received') {
        receivedMap[s.peer_id] = amt;
      } else {
        paidMap[s.peer_id] = amt;
      }
    }

    const pairwise: any[] = [];
    const myDebts: any[] = [];

    // Compute canonical bilateral netted debt between current user and each peer
    for (const [peerId, peerName] of peerNames.entries()) {
      const theyOweGross        = theyOweMap[peerId] || 0;
      const myDebtGross         = myDebtMap[peerId] || 0;
      const settlementsReceived = receivedMap[peerId] || 0;
      const settlementsPaid     = paidMap[peerId] || 0;

      // Net balance between current user (uid) and peer:
      // (Value I transferred to peer) - (Value peer transferred to me)
      const netOwedToMe = (theyOweGross + settlementsPaid) - (myDebtGross + settlementsReceived);

      if (netOwedToMe > 0) {
        pairwise.push({
          debtorId:      peerId,
          debtorName:    peerName,
          grossOwed:     theyOweGross,
          confirmedPaid: settlementsReceived,
          crossOffset:   myDebtGross + settlementsPaid,
          outstanding:   netOwedToMe,
        });
      } else if (netOwedToMe < 0) {
        myDebts.push({
          creditorId:    peerId,
          creditorName:  peerName,
          grossOwe:      myDebtGross,
          confirmedPaid: settlementsPaid,
          crossOffset:   theyOweGross + settlementsReceived,
          outstanding:   Math.abs(netOwedToMe),
        });
      }
    }

    const totalOwedToMe = pairwise.reduce((acc: number, p: any) => acc + Number(p.outstanding || 0), 0);
    const totalOwedByMe = myDebts.reduce((acc: number, d: any) => acc + Number(d.outstanding || 0), 0);

    const result = {
      personalSpending:  parseInt(totalsRow?.personal_spending || 0, 10),
      commonShare:       parseInt(totalsRow?.common_share || 0, 10),
      commonPaid:        parseInt(totalsRow?.common_paid || 0, 10),
      advancedForOthers: parseInt(totalsRow?.advanced_for_others || 0, 10),
      owedToMe:          totalOwedToMe,
      owedByMe:          totalOwedByMe,
      pairwise,
      myDebts,
    };

    balanceCache.set(cacheKey, { data: result, timestamp: now });
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.json(result);
  } catch (err) {
    console.error('[balances GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
