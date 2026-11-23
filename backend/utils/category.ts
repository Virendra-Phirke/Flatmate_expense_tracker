import { randomUUID as uuidv4 } from 'crypto';
import sql from '../db/index';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Household-scoped category resolution and creation.
 */
export async function resolveCategoryId(
  categoryInput?: string | null,
  householdId?: string | null
): Promise<string | null> {
  if (!categoryInput) return null;
  const val = String(categoryInput).trim();
  if (!val) return null;

  // Direct UUID match
  if (UUID_REGEX.test(val)) {
    const rows = await sql`
      SELECT id FROM categories
      WHERE id = ${val}
        AND (household_id = ${householdId} OR household_id IS NULL)`;
    if (rows.length) return rows[0].id;
  }

  // Case-insensitive name match within household or global fallback
  if (householdId) {
    const existingHousehold = await sql`
      SELECT id FROM categories
      WHERE LOWER(name) = LOWER(${val})
        AND household_id = ${householdId}
      LIMIT 1`;
    if (existingHousehold.length) return existingHousehold[0].id;
  }

  const existingGlobal = await sql`
    SELECT id FROM categories
    WHERE LOWER(name) = LOWER(${val})
      AND household_id IS NULL
    LIMIT 1`;
  if (existingGlobal.length) return existingGlobal[0].id;

  // Dynamically insert new category bound to the household
  const newId = uuidv4();
  await sql`
    INSERT INTO categories (id, household_id, name, is_active)
    VALUES (${newId}, ${householdId || null}, ${val.slice(0, 100)}, TRUE)`;

  return newId;
}

export default resolveCategoryId;
