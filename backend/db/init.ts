import { randomUUID as uuidv4 } from 'crypto';
import { hashPassword } from '../utils/password';
import sql from './index';

export async function initDB() {
  // ── Tables ────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS households (
      id         UUID PRIMARY KEY,
      name       TEXT NOT NULL,
      timezone   TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      currency   TEXT NOT NULL DEFAULT 'INR',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                  UUID PRIMARY KEY,
      full_name           TEXT NOT NULL,
      username            TEXT NOT NULL UNIQUE,
      password_hash       TEXT NOT NULL,
      is_active           BOOLEAN NOT NULL DEFAULT TRUE,
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS household_members (
      household_id UUID NOT NULL REFERENCES households(id),
      user_id      UUID NOT NULL REFERENCES users(id),
      role         TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      is_active    BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY  (household_id, user_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id           UUID PRIMARY KEY,
      name         TEXT NOT NULL,
      expense_type TEXT,
      is_active    BOOLEAN NOT NULL DEFAULT TRUE
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id           UUID PRIMARY KEY,
      household_id UUID NOT NULL REFERENCES households(id),
      created_by   UUID NOT NULL REFERENCES users(id),
      expense_type TEXT NOT NULL CHECK (expense_type IN ('personal', 'on_behalf', 'common')),
      description  TEXT NOT NULL,
      amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
      currency     TEXT NOT NULL DEFAULT 'INR',
      category_id  UUID REFERENCES categories(id),
      paid_by      UUID NOT NULL REFERENCES users(id),
      expense_date DATE NOT NULL,
      split_method TEXT,
      notes        TEXT,
      status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')),
      is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS expense_items (
      id               UUID PRIMARY KEY,
      expense_id       UUID NOT NULL REFERENCES expenses(id),
      description      TEXT NOT NULL,
      quantity         NUMERIC,
      unit_amount_paise BIGINT,
      amount_paise     BIGINT NOT NULL CHECK (amount_paise > 0),
      category_id      UUID REFERENCES categories(id),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS expense_shares (
      id              UUID PRIMARY KEY,
      expense_id      UUID NOT NULL REFERENCES expenses(id),
      expense_item_id UUID REFERENCES expense_items(id),
      user_id         UUID NOT NULL REFERENCES users(id),
      amount_paise    BIGINT NOT NULL CHECK (amount_paise > 0),
      share_type      TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS member_upi_profiles (
      user_id      UUID PRIMARY KEY REFERENCES users(id),
      upi_id       TEXT NOT NULL,
      display_name TEXT NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS settlements (
      id                     UUID PRIMARY KEY,
      household_id           UUID NOT NULL REFERENCES households(id),
      payer_id               UUID NOT NULL REFERENCES users(id),
      recipient_id           UUID NOT NULL REFERENCES users(id),
      amount_paise           BIGINT NOT NULL CHECK (amount_paise > 0),
      method                 TEXT NOT NULL CHECK (method IN ('cash', 'upi')),
      status                 TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'verification_pending', 'confirmed', 'rejected', 'cancelled')),
      transaction_reference  TEXT,
      note                   TEXT,
      recipient_name_snapshot TEXT,
      recipient_upi_snapshot  TEXT,
      expense_share_id       UUID REFERENCES expense_shares(id),
      claimed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmed_at           TIMESTAMPTZ,
      confirmed_by           UUID REFERENCES users(id),
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id            UUID PRIMARY KEY,
      actor_user_id UUID REFERENCES users(id),
      household_id  UUID REFERENCES households(id),
      entity_type   TEXT NOT NULL,
      entity_id     UUID,
      action        TEXT NOT NULL,
      before_state  JSONB,
      after_state   JSONB,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  // ── High-Performance Query Indexes ─────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_household_date ON expenses(household_id, expense_date DESC, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_type_del ON expenses(household_id, expense_type, is_deleted)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_personal_fast ON expenses(household_id, paid_by, expense_date DESC, created_at DESC) WHERE expense_type = 'personal' AND is_deleted = FALSE`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_common_fast ON expenses(household_id, expense_date DESC, created_at DESC) WHERE expense_type = 'common' AND is_deleted = FALSE`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_on_behalf_fast ON expenses(household_id, paid_by, expense_date DESC, created_at DESC) WHERE expense_type = 'on_behalf' AND is_deleted = FALSE`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items(expense_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_shares_user ON expense_shares(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_shares_exp_id ON expense_shares(expense_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_shares_exp_user ON expense_shares(expense_id, user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_shares_item_id ON expense_shares(expense_item_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settlements_payer_fast ON settlements(household_id, payer_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settlements_recipient_fast ON settlements(household_id, recipient_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settlements_hh_status ON settlements(household_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settlements_share_id ON settlements(expense_share_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settlements_confirmed ON settlements(household_id, status, payer_id, recipient_id)`;

  // ── Seed categories ───────────────────────────────────────────────────────
  const catCount = await sql`SELECT COUNT(*) AS c FROM categories`;
  if (parseInt(catCount[0].c, 10) === 0) {
    const cats = [
      'Rent', 'Electricity', 'Water', 'Gas', 'Groceries',
      'Eating Out', 'Transport', 'Medicines', 'Entertainment',
      'Household Supplies', 'Internet', 'Miscellaneous',
    ];
    for (const name of cats) {
      await sql`INSERT INTO categories (id, name) VALUES (${uuidv4()}, ${name})`;
    }
    console.log('Seeded categories.');
  }

  // ── Seed household ────────────────────────────────────────────────────────
  const hh = await sql`SELECT id FROM households LIMIT 1`;
  let householdId: string;
  if (hh.length === 0) {
    householdId = uuidv4();
    await sql`INSERT INTO households (id, name) VALUES (${householdId}, 'The Flat')`;
    console.log('Created household:', householdId);
  } else {
    householdId = hh[0].id;
  }

  // ── Seed users ────────────────────────────────────────────────────────────
  const flatmates = [
    { name: 'Virendra',  username: 'virendra',  role: 'admin'  },
    { name: 'Saurav',    username: 'saurav',    role: 'member' },
    { name: 'Prathmesh', username: 'prathmesh', role: 'member' },
    { name: 'Harshal',   username: 'harshal',   role: 'member' },
    { name: 'Pranay',    username: 'pranay',    role: 'member' },
  ];

  for (const fm of flatmates) {
    const existing = await sql`SELECT id FROM users WHERE username = ${fm.username}`;
    if (existing.length === 0) {
      const defaultPw = process.env.DEFAULT_INITIAL_PASSWORD || '123456';
      const hash = await hashPassword(defaultPw);
      const uid = uuidv4();
      await sql`
        INSERT INTO users (id, full_name, username, password_hash, must_change_password)
        VALUES (${uid}, ${fm.name}, ${fm.username}, ${hash}, TRUE)`;
      await sql`
        INSERT INTO household_members (household_id, user_id, role)
        VALUES (${householdId}, ${uid}, ${fm.role})`;
      console.log(`  Seeded user: ${fm.username} (${fm.role})`);
    }
  }

  console.log('DB ready.\n');
}

export default { initDB };
