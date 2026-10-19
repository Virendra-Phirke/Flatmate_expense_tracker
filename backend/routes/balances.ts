import { Router, Request, Response } from 'express';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── GET /api/balances & /api/balances/summary ────────────────────────────────
// Computes canonical household balances across personal, common, and on-behalf expenses (AUD-01)
router.get(['/', '/summary'], requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;

  try {
    // Execute all balance queries in parallel to eliminate sequential network round-trips
    const [
      [personalRow],
      [commonShareRow],
      [commonPaidRow],
      [advancedRow],
      theyOweRows,
      receivedByPayer,
      myDebtRows,
      paidToCreditor,
    ] = await Promise.all([
      // 1. Personal spending
      sql`
        SELECT COALESCE(SUM(amount_paise), 0) AS total
        FROM   expenses
        WHERE  household_id  = ${hid}
          AND  expense_type  = 'personal'
          AND  paid_by       = ${uid}
          AND  is_deleted    = FALSE`,

      // 2. Common share
      sql`
        SELECT COALESCE(SUM(es.amount_paise), 0) AS total
        FROM   expense_shares es
        JOIN   expenses        e  ON e.id = es.expense_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type = 'common'
          AND  es.user_id     = ${uid}
          AND  e.is_deleted   = FALSE`,

      // 3. Common paid by me
      sql`
        SELECT COALESCE(SUM(amount_paise), 0) AS total
        FROM   expenses
        WHERE  household_id = ${hid}
          AND  expense_type = 'common'
          AND  paid_by      = ${uid}
          AND  is_deleted   = FALSE`,

      // 4. Advanced for others
      sql`
        SELECT COALESCE(SUM(es.amount_paise), 0) AS total
        FROM   expense_shares es
        JOIN   expenses        e ON e.id = es.expense_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type IN ('on_behalf', 'common')
          AND  e.paid_by      = ${uid}
          AND  es.user_id    != ${uid}
          AND  e.is_deleted   = FALSE`,

      // 5. Who owes me (gross)
      sql`
        SELECT es.user_id AS debtor_id, u.full_name AS debtor_name,
               COALESCE(SUM(es.amount_paise), 0) AS gross_owed
        FROM   expense_shares es
        JOIN   expenses        e  ON e.id  = es.expense_id
        JOIN   users           u  ON u.id  = es.user_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type IN ('on_behalf', 'common')
          AND  e.paid_by      = ${uid}
          AND  es.user_id    != ${uid}
          AND  e.is_deleted   = FALSE
        GROUP  BY es.user_id, u.full_name`,

      // 6. Settlements received by me
      sql`
        SELECT payer_id, COALESCE(SUM(amount_paise), 0) AS confirmed_paid
        FROM   settlements
        WHERE  household_id = ${hid}
          AND  recipient_id = ${uid}
          AND  status       = 'confirmed'
        GROUP  BY payer_id`,

      // 7. What I owe others (gross)
      sql`
        SELECT e.paid_by AS creditor_id, u.full_name AS creditor_name,
               COALESCE(SUM(es.amount_paise), 0) AS gross_owe
        FROM   expense_shares es
        JOIN   expenses        e  ON e.id  = es.expense_id
        JOIN   users           u  ON u.id  = e.paid_by
        WHERE  e.household_id = ${hid}
          AND  e.expense_type IN ('on_behalf', 'common')
          AND  es.user_id     = ${uid}
          AND  e.paid_by     != ${uid}
          AND  e.is_deleted   = FALSE
        GROUP  BY e.paid_by, u.full_name`,

      // 8. Settlements paid to others
      sql`
        SELECT recipient_id, COALESCE(SUM(amount_paise), 0) AS confirmed_paid
        FROM   settlements
        WHERE  household_id = ${hid}
          AND  payer_id     = ${uid}
          AND  status       = 'confirmed'
        GROUP  BY recipient_id`,
    ]);

    const receivedMap: Record<string, number> = Object.fromEntries(
      (receivedByPayer || []).map((r: any) => [r.payer_id, parseInt(r.confirmed_paid || 0, 10)])
    );

    const pairwise = (theyOweRows || [])
      .map((r: any) => {
        const gross = parseInt(r.gross_owed || 0, 10);
        const paid  = receivedMap[r.debtor_id] || 0;
        return {
          debtorId:      r.debtor_id,
          debtorName:    r.debtor_name,
          grossOwed:     gross,
          confirmedPaid: paid,
          outstanding:   Math.max(0, gross - paid),
        };
      })
      .filter((r: any) => r.outstanding > 0);

    const paidMap: Record<string, number> = Object.fromEntries(
      (paidToCreditor || []).map((r: any) => [r.recipient_id, parseInt(r.confirmed_paid || 0, 10)])
    );

    const myDebts = (myDebtRows || [])
      .map((r: any) => {
        const gross = parseInt(r.gross_owe || 0, 10);
        const paid  = paidMap[r.creditor_id] || 0;
        return {
          creditorId:    r.creditor_id,
          creditorName:  r.creditor_name,
          grossOwe:      gross,
          confirmedPaid: paid,
          outstanding:   Math.max(0, gross - paid),
        };
      })
      .filter((r: any) => r.outstanding > 0);

    const totalOwedToMe = pairwise.reduce((acc: number, p: any) => acc + Number(p.outstanding || 0), 0);
    const totalOwedByMe = myDebts.reduce((acc: number, d: any) => acc + Number(d.outstanding || 0), 0);

    res.json({
      personalSpending:  parseInt(personalRow?.total || 0, 10),
      commonShare:       parseInt(commonShareRow?.total || 0, 10),
      commonPaid:        parseInt(commonPaidRow?.total || 0, 10),
      advancedForOthers: parseInt(advancedRow?.total || 0, 10),
      owedToMe:          totalOwedToMe,
      owedByMe:          totalOwedByMe,
      pairwise,
      myDebts,
    });
  } catch (err) {
    console.error('[balances GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
