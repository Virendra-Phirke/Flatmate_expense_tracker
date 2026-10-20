import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import sql from '../db/index';
import { requireAuth } from '../middleware/auth';
import { rateLimitAI } from '../middleware/rateLimiter';

const router = Router();

// Initialize Google GenAI client if key is configured
const getAIClient = (): GoogleGenAI | null => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

// Preferred model list with fallback capability
const PREFERRED_MODELS: string[] = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
].filter(Boolean) as string[];

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone
 */
function getTodayKolkata(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

// ── GET /api/ai/status ────────────────────────────────────────────────────────
router.get('/status', requireAuth, (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    available: hasKey,
    model: PREFERRED_MODELS[0] || 'gemini-3.5-flash',
  });
});

// ── POST /api/ai/parse-expense ────────────────────────────────────────────────
router.post('/parse-expense', requireAuth, rateLimitAI, async (req: Request, res: Response) => {
  const { transcript, clientDate } = req.body;

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'Voice transcript or text input is required.' });
  }

  const ai = getAIClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini AI is not configured on this server. Please set GEMINI_API_KEY in environment variables.',
    });
  }

  const session = (req as any).session;
  const uid = session.userId;
  const hid = session.householdId;
  const todayDate = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayKolkata();

  try {
    // 1. Fetch active household members
    const members = await sql`
      SELECT u.id, u.full_name, u.username, hm.role
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = ${hid} AND hm.is_active = TRUE
      ORDER BY u.full_name ASC
    `;

    if (!members.length) {
      return res.status(400).json({ error: 'No active household members found.' });
    }

    // 2. Fetch active categories
    const categories = await sql`
      SELECT id, name FROM categories WHERE is_active = TRUE ORDER BY name ASC
    `;

    const currentUser = members.find((m: any) => m.id === uid) || { id: uid, full_name: 'Me', role: session.role };

    // 3. Construct Gemini Prompt
    const membersContext = members.map((m: any) => ({
      id: m.id,
      name: m.full_name,
      username: m.username,
      isCurrentUser: m.id === uid,
    }));

    const categoriesList = categories.map((c: any) => c.name);

    const systemPrompt = `You are an intelligent expense parser for a flatmate expense manager in India.
Current logged-in user:
${JSON.stringify({ id: currentUser.id, name: currentUser.full_name, role: currentUser.role })}

Active Household Members:
${JSON.stringify(membersContext, null, 2)}

Available Categories:
${JSON.stringify(categoriesList)}

Today's Date: "${todayDate}" (use this reference for "today", "yesterday", "day before yesterday", days of the week, etc.)
Currency: Indian Rupee (INR). All final amounts must be in PAISE (1 rupee = 100 paise). E.g. ₹450 = 45000 paise.

Instructions:
Analyze the user's voice input transcript:
"${transcript.trim()}"

Identify:
1. "expense_type":
   - "personal": The user spent money strictly on themselves (e.g. "I spent 150 on breakfast", "Uber ride 200", "my mobile recharge 299").
   - "on_behalf": The user bought items on behalf of one or more specific flatmates (e.g. "Bought medicine for Rahul 250", "Paid 300 for Saurav's snacks and 100 for Rahul").
   - "common": Shared household expenses split among flatmates (e.g. "Paid electricity bill 1200 split equally", "Groceries 1500 split with everyone", "Dinner 900 split between me, Rahul, Amit"). If not specified otherwise and multiple people or house supplies are involved (e.g. WiFi, rent, maid, gas, water, groceries for flat), it's "common".

2. "description": A concise, clean description (e.g. "Groceries", "Uber ride", "Medicine for Rahul").
3. "amount_paise": Total expense amount in paise.
4. "expense_date": YYYY-MM-DD.
5. "category": Best matching category name from available categories or a sensible new category.
6. "notes": Any additional context or remarks mentioned.

If expense_type == "on_behalf":
- "items": Array of item objects. For each item:
  - "description": name of item (e.g. "Medicine")
  - "beneficiary_id": EXACT member ID from Active Household Members list who received/benefited from this item
  - "beneficiary_name": Full name of that beneficiary
  - "amount_paise": Item price in paise
  - "category": Category name for this item
  The sum of item amount_paise MUST equal total amount_paise.

If expense_type == "common":
- "split_method": "equal" or "custom"
- "paid_by_id": member ID who paid (default to current logged-in user ID unless specified)
- "shares": Array of participant shares with:
  - "user_id": member ID
  - "user_name": member full name
  - "amount_paise": share in paise
  If split equally with all flatmates, divide the total equally among ALL active household members. The sum of all shares MUST equal total amount_paise.

Ensure member IDs are EXACT strings matching the provided Active Household Members list.
Return the output strictly matching the JSON schema.`;

    // 4. Generate structured content with model fallback
    let aiResponse: string | null = null;
    let usedModel: string | null = null;
    let lastError: any = null;

    const schemaConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expense_type: { type: Type.STRING, enum: ['personal', 'on_behalf', 'common'] },
          description: { type: Type.STRING },
          amount_paise: { type: Type.INTEGER },
          expense_date: { type: Type.STRING },
          category: { type: Type.STRING },
          notes: { type: Type.STRING },
          split_method: { type: Type.STRING },
          paid_by_id: { type: Type.STRING },
          paid_by_name: { type: Type.STRING },
          shares: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                user_id: { type: Type.STRING },
                user_name: { type: Type.STRING },
                amount_paise: { type: Type.INTEGER },
              },
              required: ['user_id', 'amount_paise'],
            },
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                beneficiary_id: { type: Type.STRING },
                beneficiary_name: { type: Type.STRING },
                amount_paise: { type: Type.INTEGER },
                category: { type: Type.STRING },
              },
              required: ['description', 'beneficiary_id', 'amount_paise'],
            },
          },
          summary: { type: Type.STRING },
        },
        required: ['expense_type', 'description', 'amount_paise', 'expense_date'],
      },
    };

    for (const modelName of PREFERRED_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: systemPrompt,
            config: schemaConfig as any,
          });
          if (resp && resp.text) {
            aiResponse = resp.text;
            usedModel = modelName;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Parse] Model ${modelName} (attempt ${attempt}) failed:`, err.message);
          if (attempt === 1 && (err.message?.includes('503') || err.message?.includes('timeout') || err.message?.includes('fetch failed'))) {
            // Wait 500ms before retrying transient spike
            await new Promise(r => setTimeout(r, 500));
          } else {
            break; // Proceed to next model
          }
        }
      }
      if (aiResponse) break;
    }

    if (!aiResponse) {
      throw lastError || new Error('No response received from Gemini AI');
    }

    // 5. Parse and post-process / validate parsed payload
    const parsed = JSON.parse(aiResponse);

    // Validate and clean amount_paise
    if (!Number.isInteger(parsed.amount_paise) || parsed.amount_paise <= 0) {
      return res.status(422).json({
        error: 'Could not determine a valid expense amount from the input.',
        raw: parsed,
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.expense_date)) {
      parsed.expense_date = todayDate;
    }

    // Ensure member map for fast lookup
    const memberMap = new Map(members.map((m: any) => [m.id, m]));
    const nameMap = new Map();
    members.forEach((m: any) => {
      nameMap.set(m.full_name.toLowerCase(), m);
      nameMap.set(m.username.toLowerCase(), m);
      const first = m.full_name.split(' ')[0].toLowerCase();
      if (!nameMap.has(first)) nameMap.set(first, m);
    });

    // Normalize on_behalf items
    if (parsed.expense_type === 'on_behalf') {
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        let itemsSum = 0;
        parsed.items = parsed.items.map((item: any) => {
          let benId = item.beneficiary_id;
          if (!memberMap.has(benId)) {
            // Attempt name lookup
            const found = nameMap.get((item.beneficiary_name || '').toLowerCase());
            if (found) benId = found.id;
          }
          const ben = memberMap.get(benId) || currentUser;
          const p = Number.isInteger(item.amount_paise) && item.amount_paise > 0 ? item.amount_paise : 0;
          itemsSum += p;
          return {
            description: item.description || parsed.description,
            beneficiary_id: ben.id,
            beneficiary_name: ben.full_name,
            amount_paise: p,
            category: item.category || parsed.category || 'General',
          };
        });

        if (itemsSum > 0) {
          parsed.amount_paise = itemsSum; // Align total with sum of items
        }
      } else {
        // Fallback single item for on_behalf if no items array returned
        parsed.items = [{
          description: parsed.description,
          beneficiary_id: currentUser.id,
          beneficiary_name: currentUser.full_name,
          amount_paise: parsed.amount_paise,
          category: parsed.category || 'General',
        }];
      }
    }

    // Normalize common shares
    if (parsed.expense_type === 'common') {
      parsed.paid_by_id = memberMap.has(parsed.paid_by_id) ? parsed.paid_by_id : currentUser.id;
      parsed.paid_by_name = (memberMap.get(parsed.paid_by_id) as any)?.full_name || currentUser.full_name;

      if (!Array.isArray(parsed.shares) || parsed.shares.length === 0) {
        // Equal split among all active household members
        const count = members.length;
        const baseShare = Math.floor(parsed.amount_paise / count);
        let remainder = parsed.amount_paise % count;

        parsed.shares = members.map((m: any) => {
          const sharePaise = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          return {
            user_id: m.id,
            user_name: m.full_name,
            amount_paise: sharePaise,
          };
        });
      } else {
        // Validate each share has correct member info
        parsed.shares = parsed.shares.map((sh: any) => {
          let shId = sh.user_id;
          if (!memberMap.has(shId)) {
            const found = nameMap.get((sh.user_name || '').toLowerCase());
            if (found) shId = found.id;
          }
          const mem = memberMap.get(shId) || members[0];
          return {
            user_id: mem.id,
            user_name: mem.full_name,
            amount_paise: Number.isInteger(sh.amount_paise) ? sh.amount_paise : 0,
          };
        });

        // Ensure shares sum matches amount_paise
        parsed.amount_paise = Number(parsed.amount_paise || 0);
        const totalShares = parsed.shares.reduce((sum: number, s: any) => sum + Number(s.amount_paise || 0), 0);
        if (totalShares !== parsed.amount_paise && parsed.shares.length > 0) {
          const diff = parsed.amount_paise - totalShares;
          parsed.shares[0].amount_paise += diff;
        }
      }
    }

    // Return sanitized parsed expense
    res.json({
      success: true,
      modelUsed: usedModel,
      originalTranscript: transcript,
      parsed,
    });
  } catch (err: any) {
    console.error('[POST /api/ai/parse-expense]', err);
    res.status(500).json({
      error: err.message || 'Failed to parse voice expense with Gemini AI',
    });
  }
});

export default router;
