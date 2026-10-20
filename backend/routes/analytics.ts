import { Router, Request, Response } from 'express';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// High-speed in-memory analytics cache (15-second TTL)
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000;

export function invalidateAnalyticsCache(householdId?: string) {
  if (householdId) {
    for (const key of analyticsCache.keys()) {
      if (key.startsWith(`${householdId}:`)) {
        analyticsCache.delete(key);
      }
    }
  } else {
    analyticsCache.clear();
  }
}

// ── GET /api/analytics ───────────────────────────────────────────────────────
// Returns unified spending intelligence, category breakdown, daily trends,
// expense type distribution, and flatmate share analysis.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;

  const { from, to, type, category } = req.query;

  const validFrom = from && DATE_REGEX.test(String(from)) ? String(from) : '1970-01-01';
  const validTo   = to   && DATE_REGEX.test(String(to))   ? String(to)   : '2099-12-31';
  const filterType = type && ['personal', 'common', 'on_behalf'].includes(String(type)) ? String(type) : 'all';
  const filterCategory = category ? String(category).trim().toLowerCase() : '';

  const cacheKey = `${hid}:${uid}:${validFrom}:${validTo}:${filterType}:${filterCategory}`;
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=15');
    return res.json(cached.data);
  }

  try {
    // Execute a single consolidated SQL query to minimize network latency
    const [row] = await sql`
      WITH user_expenses AS (
        -- 1. Personal expenses paid by user
        SELECT
          e.id,
          e.expense_date,
          e.created_at,
          'personal' AS expense_type,
          e.description,
          e.amount_paise AS my_amount_paise,
          e.amount_paise AS total_amount_paise,
          COALESCE(c.name, 'Uncategorized') AS category_name,
          NULL::uuid AS other_user_id,
          NULL::text AS other_user_name
        FROM expenses e
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.household_id = ${hid}
          AND e.expense_type = 'personal'
          AND e.paid_by = ${uid}
          AND e.is_deleted = FALSE
          AND e.expense_date >= ${validFrom}
          AND e.expense_date <= ${validTo}
          AND (${filterType} = 'all' OR ${filterType} = 'personal')
          AND (${filterCategory} = '' OR LOWER(COALESCE(c.name, 'Uncategorized')) = ${filterCategory})

        UNION ALL

        -- 2. Household Common expenses (user's allocated split share)
        SELECT
          e.id,
          e.expense_date,
          e.created_at,
          'common' AS expense_type,
          e.description,
          es.amount_paise AS my_amount_paise,
          e.amount_paise AS total_amount_paise,
          COALESCE(c.name, 'Household Common') AS category_name,
          NULL::uuid AS other_user_id,
          NULL::text AS other_user_name
        FROM expense_shares es
        JOIN expenses e ON e.id = es.expense_id
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.household_id = ${hid}
          AND e.expense_type = 'common'
          AND es.user_id = ${uid}
          AND e.is_deleted = FALSE
          AND e.expense_date >= ${validFrom}
          AND e.expense_date <= ${validTo}
          AND (${filterType} = 'all' OR ${filterType} = 'common')
          AND (${filterCategory} = '' OR LOWER(COALESCE(c.name, 'Household Common')) = ${filterCategory})

        UNION ALL

        -- 3. On-behalf purchases made for flatmates
        SELECT
          e.id,
          e.expense_date,
          e.created_at,
          'on_behalf' AS expense_type,
          COALESCE(ei.description, e.description) AS description,
          es.amount_paise AS my_amount_paise,
          e.amount_paise AS total_amount_paise,
          COALESCE(c.name, 'Shopping') AS category_name,
          u.id AS other_user_id,
          u.full_name AS other_user_name
        FROM expense_shares es
        JOIN expenses e ON e.id = es.expense_id
        JOIN users u ON u.id = es.user_id
        LEFT JOIN expense_items ei ON ei.id = es.expense_item_id
        LEFT JOIN categories c ON c.id = COALESCE(ei.category_id, e.category_id)
        WHERE e.household_id = ${hid}
          AND e.expense_type = 'on_behalf'
          AND e.paid_by = ${uid}
          AND es.user_id != ${uid}
          AND e.is_deleted = FALSE
          AND e.expense_date >= ${validFrom}
          AND e.expense_date <= ${validTo}
          AND (${filterType} = 'all' OR ${filterType} = 'on_behalf')
          AND (${filterCategory} = '' OR LOWER(COALESCE(c.name, 'Shopping')) = ${filterCategory})
      )
      SELECT
        -- Summary KPIs
        (SELECT json_build_object(
          'total_spending_paise', COALESCE(SUM(my_amount_paise), 0),
          'personal_spending_paise', COALESCE(SUM(CASE WHEN expense_type = 'personal' THEN my_amount_paise ELSE 0 END), 0),
          'common_share_paise', COALESCE(SUM(CASE WHEN expense_type = 'common' THEN my_amount_paise ELSE 0 END), 0),
          'on_behalf_paid_paise', COALESCE(SUM(CASE WHEN expense_type = 'on_behalf' THEN my_amount_paise ELSE 0 END), 0),
          'transaction_count', COUNT(*)
        ) FROM user_expenses) AS kpi,

        -- Category Breakdown
        (SELECT COALESCE(json_agg(json_build_object(
          'category_name', sub.category_name,
          'total_paise', sub.total_paise,
          'count', sub.count,
          'personal_paise', sub.personal_paise,
          'common_paise', sub.common_paise,
          'on_behalf_paise', sub.on_behalf_paise
        )), '[]'::json) FROM (
          SELECT
            category_name,
            COALESCE(SUM(my_amount_paise), 0) AS total_paise,
            COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN expense_type = 'personal' THEN my_amount_paise ELSE 0 END), 0) AS personal_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'common' THEN my_amount_paise ELSE 0 END), 0) AS common_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'on_behalf' THEN my_amount_paise ELSE 0 END), 0) AS on_behalf_paise
          FROM user_expenses
          GROUP BY category_name
          ORDER BY total_paise DESC
        ) sub) AS categories,

        -- Daily Trend
        (SELECT COALESCE(json_agg(json_build_object(
          'expense_date', sub.expense_date,
          'total_paise', sub.total_paise,
          'personal_paise', sub.personal_paise,
          'common_paise', sub.common_paise,
          'on_behalf_paise', sub.on_behalf_paise,
          'count', sub.count
        )), '[]'::json) FROM (
          SELECT
            expense_date,
            COALESCE(SUM(my_amount_paise), 0) AS total_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'personal' THEN my_amount_paise ELSE 0 END), 0) AS personal_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'common' THEN my_amount_paise ELSE 0 END), 0) AS common_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'on_behalf' THEN my_amount_paise ELSE 0 END), 0) AS on_behalf_paise,
            COUNT(*) AS count
          FROM user_expenses
          GROUP BY expense_date
          ORDER BY expense_date ASC
        ) sub) AS daily_trend,

        -- Roommate Beneficiary Breakdown (who I bought for)
        (SELECT COALESCE(json_agg(json_build_object(
          'roommate_id', sub.other_user_id,
          'roommate_name', sub.other_user_name,
          'total_paise', sub.total_paise,
          'count', sub.count
        )), '[]'::json) FROM (
          SELECT
            other_user_id,
            other_user_name,
            COALESCE(SUM(my_amount_paise), 0) AS total_paise,
            COUNT(*) AS count
          FROM user_expenses
          WHERE expense_type = 'on_behalf' AND other_user_id IS NOT NULL
          GROUP BY other_user_id, other_user_name
          ORDER BY total_paise DESC
        ) sub) AS roommates,

        -- Top Transactions
        (SELECT COALESCE(json_agg(json_build_object(
          'id', sub.id,
          'description', sub.description,
          'expense_date', sub.expense_date,
          'expense_type', sub.expense_type,
          'category_name', sub.category_name,
          'amount_paise', sub.my_amount_paise,
          'other_user_name', sub.other_user_name
        )), '[]'::json) FROM (
          SELECT id, description, expense_date, expense_type, category_name, my_amount_paise, other_user_name
          FROM user_expenses
          ORDER BY expense_date DESC, my_amount_paise DESC
          LIMIT 200
        ) sub) AS top_transactions
    `;

    const kpiRaw = row?.kpi || {};
    const totalSpending = parseInt(kpiRaw.total_spending_paise || 0, 10);
    const personalSpending = parseInt(kpiRaw.personal_spending_paise || 0, 10);
    const commonShare = parseInt(kpiRaw.common_share_paise || 0, 10);
    const onBehalfPaid = parseInt(kpiRaw.on_behalf_paid_paise || 0, 10);
    const transactionCount = parseInt(kpiRaw.transaction_count || 0, 10);

    const categoriesRaw = row?.categories || [];
    const categories = categoriesRaw.map((c: any) => {
      const tot = parseInt(c.total_paise || 0, 10);
      return {
        categoryName: c.category_name,
        totalPaise: tot,
        percentage: totalSpending > 0 ? Math.round((tot / totalSpending) * 1000) / 10 : 0,
        count: parseInt(c.count || 0, 10),
        personalPaise: parseInt(c.personal_paise || 0, 10),
        commonPaise: parseInt(c.common_paise || 0, 10),
        onBehalfPaise: parseInt(c.on_behalf_paise || 0, 10),
      };
    });

    const dailyTrendRaw = row?.daily_trend || [];
    let runningCumulative = 0;
    const dailyTrend = dailyTrendRaw.map((d: any) => {
      const dayTotal = parseInt(d.total_paise || 0, 10);
      runningCumulative += dayTotal;
      return {
        date: d.expense_date,
        expense_date: d.expense_date,
        totalPaise: dayTotal,
        personalPaise: parseInt(d.personal_paise || 0, 10),
        commonPaise: parseInt(d.common_paise || 0, 10),
        onBehalfPaise: parseInt(d.on_behalf_paise || 0, 10),
        cumulativePaise: runningCumulative,
        count: parseInt(d.count || 0, 10),
      };
    });

    const roommates = (row?.roommates || []).map((r: any) => ({
      roommateId: r.roommate_id,
      roommateName: r.roommate_name,
      totalPaise: parseInt(r.total_paise || 0, 10),
      count: parseInt(r.count || 0, 10),
    }));

    const topTransactions = (row?.top_transactions || []).map((t: any) => ({
      id: t.id,
      description: t.description,
      expenseDate: t.expense_date,
      expenseType: t.expense_type,
      categoryName: t.category_name,
      amountPaise: parseInt(t.amount_paise || 0, 10),
      otherUserName: t.other_user_name,
    }));

    // Calculate daily average
    const daysInPeriod = Math.max(1, dailyTrend.length);
    const dailyAveragePaise = Math.round(totalSpending / daysInPeriod);

    const result = {
      kpi: {
        totalSpendingPaise: totalSpending,
        personalSpendingPaise: personalSpending,
        commonSharePaise: commonShare,
        onBehalfPaidPaise: onBehalfPaid,
        transactionCount,
        dailyAveragePaise,
        topCategoryName: categories[0]?.categoryName || 'None',
        topCategoryPaise: categories[0]?.totalPaise || 0,
      },
      typeDistribution: {
        personalPaise: personalSpending,
        personalPercentage: totalSpending > 0 ? Math.round((personalSpending / totalSpending) * 1000) / 10 : 0,
        commonPaise: commonShare,
        commonPercentage: totalSpending > 0 ? Math.round((commonShare / totalSpending) * 1000) / 10 : 0,
        onBehalfPaise: onBehalfPaid,
        onBehalfPercentage: totalSpending > 0 ? Math.round((onBehalfPaid / totalSpending) * 1000) / 10 : 0,
      },
      categories,
      dailyTrend,
      roommates,
      topTransactions,
    };

    analyticsCache.set(cacheKey, { data: result, timestamp: now });
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.json(result);
  } catch (err: any) {
    console.error('[analytics GET / error]:', err?.message || err);
    res.status(500).json({ error: 'Server error computing expense analytics' });
  }
});

export default router;
