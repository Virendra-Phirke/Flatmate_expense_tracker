import 'dotenv/config';
import sql from './index';

/**
 * Safe, idempotent forward migration implementing Phases 2, 3, 4, and 5 schema invariants.
 */
export async function runMigration() {
  console.log('🔄 Running safe database schema migration...');

  // ── Phase 3: Add household_id to categories & backfill ──────────────────────
  console.log('  1. Adding household_id to categories (Phase 3)...');
  await sql`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id);
  `;

  // Backfill existing categories without household_id to the primary household
  const defaultHousehold = await sql`SELECT id FROM households ORDER BY created_at ASC LIMIT 1`;
  if (defaultHousehold.length > 0) {
    const hhId = defaultHousehold[0].id;
    await sql`
      UPDATE categories
      SET    household_id = ${hhId}
      WHERE  household_id IS NULL;
    `;
    console.log(`     Backfilled unassigned categories to household ${hhId}.`);
  }

  // Create index on categories (household_id, is_active)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_categories_household_active
    ON categories(household_id, is_active);
  `;

  // ── Phase 2: WebAuthn Credentials & Challenges ──────────────────────────────
  console.log('  2. Creating WebAuthn tables (Phase 2)...');
  await sql`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id text NOT NULL UNIQUE,
      public_key text NOT NULL,
      counter bigint NOT NULL DEFAULT 0,
      device_name text,
      aaguid text,
      transports text,
      is_revoked boolean NOT NULL DEFAULT FALSE,
      last_used_at timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user
    ON webauthn_credentials(user_id, is_revoked);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      challenge text NOT NULL,
      type text NOT NULL,
      expires_at timestamp with time zone NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_lookup
    ON webauthn_challenges(challenge, expires_at);
  `;

  // ── Phase 4: Database Ledger Constraints ────────────────────────────────────
  console.log('  3. Enforcing database ledger constraints (Phase 4)...');

  // Helper to safely add check constraints if they do not exist
  const constraints = [
    {
      table: 'expenses',
      name: 'chk_expenses_amount_positive',
      clause: 'amount_paise > 0',
    },
    {
      table: 'expenses',
      name: 'chk_expenses_type_valid',
      clause: "expense_type IN ('personal', 'common', 'on_behalf')",
    },
    {
      table: 'expenses',
      name: 'chk_expenses_status_valid',
      clause: "status IN ('active', 'settled', 'cancelled')",
    },
    {
      table: 'expense_shares',
      name: 'chk_expense_shares_amount_positive',
      clause: 'amount_paise > 0',
    },
    {
      table: 'expense_items',
      name: 'chk_expense_items_amount_positive',
      clause: 'amount_paise > 0',
    },
    {
      table: 'settlements',
      name: 'chk_settlements_amount_positive',
      clause: 'amount_paise > 0',
    },
    {
      table: 'settlements',
      name: 'chk_settlements_status_valid',
      clause: "status IN ('pending', 'verification_pending', 'confirmed', 'rejected', 'cancelled')",
    },
    {
      table: 'settlements',
      name: 'chk_settlements_method_valid',
      clause: "method IN ('cash', 'upi')",
    },
  ];

  for (const c of constraints) {
    try {
      const exists = await sql`
        SELECT 1 FROM pg_constraint
        WHERE conname = ${c.name}
      `;
      if (!exists.length) {
        await sql.query(`ALTER TABLE ${c.table} ADD CONSTRAINT ${c.name} CHECK (${c.clause});`);
        console.log(`     Added constraint ${c.name} on ${c.table}.`);
      }
    } catch (err: any) {
      console.warn(`     Note on constraint ${c.name}: ${err?.message || err}`);
    }
  }

  // ── Phase 5: Server-Side Idempotency Keys Table ─────────────────────────────
  console.log('  4. Creating idempotency_keys table (Phase 5)...');
  await sql`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      route text NOT NULL,
      client_key text NOT NULL,
      request_hash text NOT NULL,
      status text NOT NULL DEFAULT 'processing',
      status_code integer,
      response_body jsonb,
      created_at timestamp with time zone NOT NULL DEFAULT NOW(),
      expires_at timestamp with time zone NOT NULL,
      CONSTRAINT uq_idempotency_key UNIQUE (household_id, user_id, route, client_key)
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
    ON idempotency_keys(household_id, user_id, route, client_key);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires
    ON idempotency_keys(expires_at);
  `;

  // ── Phase 6: Performance Indexes ───────────────────────────────────────────
  console.log('  5. Creating query optimization indexes (Phase 6)...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_expenses_household_type_date
    ON expenses(household_id, expense_type, expense_date DESC);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id
    ON expense_shares(expense_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_settlements_household_status
    ON settlements(household_id, status);
  `;

  console.log('✅ Safe migration completed successfully.\n');
}

if (process.argv[1]?.includes('migrate')) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
