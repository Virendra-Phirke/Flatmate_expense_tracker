import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  bigint,
  numeric,
  date,
  json,
  jsonb,
  varchar,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// ── Households ────────────────────────────────────────────────────────────────
export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  currency: text('currency').notNull().default('INR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique('users_username_key'),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Household Members ─────────────────────────────────────────────────────────
export const householdMembers = pgTable(
  'household_members',
  {
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
  ]
);

// ── Categories ────────────────────────────────────────────────────────────────
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id').references(() => households.id),
    name: text('name').notNull(),
    expenseType: text('expense_type'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('idx_categories_household_active').on(table.householdId, table.isActive),
  ]
);

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    expenseType: text('expense_type').notNull(),
    description: text('description').notNull(),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('INR'),
    categoryId: uuid('category_id').references(() => categories.id),
    paidBy: uuid('paid_by')
      .notNull()
      .references(() => users.id),
    expenseDate: date('expense_date').notNull(),
    splitMethod: text('split_method'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_expenses_household_date').on(table.householdId, table.expenseDate),
    index('idx_expenses_paid_by').on(table.paidBy),
  ]
);

// ── Expense Items ─────────────────────────────────────────────────────────────
export const expenseItems = pgTable('expense_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id')
    .notNull()
    .references(() => expenses.id),
  description: text('description').notNull(),
  quantity: numeric('quantity'),
  unitAmountPaise: bigint('unit_amount_paise', { mode: 'number' }),
  amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Expense Shares ────────────────────────────────────────────────────────────
export const expenseShares = pgTable(
  'expense_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id),
    expenseItemId: uuid('expense_item_id').references(() => expenseItems.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    shareType: text('share_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_expense_shares_user').on(table.userId),
  ]
);

// ── Member UPI Profiles ───────────────────────────────────────────────────────
export const memberUpiProfiles = pgTable('member_upi_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id),
  upiId: text('upi_id').notNull(),
  displayName: text('display_name').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Settlements ───────────────────────────────────────────────────────────────
export const settlements = pgTable(
  'settlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    payerId: uuid('payer_id')
      .notNull()
      .references(() => users.id),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    method: text('method').notNull(),
    status: text('status').notNull().default('pending'),
    transactionReference: text('transaction_reference'),
    note: text('note'),
    recipientNameSnapshot: text('recipient_name_snapshot'),
    recipientUpiSnapshot: text('recipient_upi_snapshot'),
    expenseShareId: uuid('expense_share_id').references(() => expenseShares.id),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmedBy: uuid('confirmed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_settlements_payer').on(table.payerId),
    index('idx_settlements_recipient').on(table.recipientId),
  ]
);

// ── Activity Logs ─────────────────────────────────────────────────────────────
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  householdId: uuid('household_id').references(() => households.id),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  action: text('action').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Session (connect-pg-simple) ───────────────────────────────────────────────
export const session = pgTable(
  'session',
  {
    sid: varchar('sid', { length: 255 }).primaryKey().notNull(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6 }).notNull(),
  },
  (table) => [
    index('IDX_session_expire').on(table.expire),
  ]
);

// ── WebAuthn Credentials (Phase 2) ────────────────────────────────────────────
export const webauthnCredentials = pgTable(
  'webauthn_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    deviceName: text('device_name'),
    aaguid: text('aaguid'),
    transports: text('transports'),
    isRevoked: boolean('is_revoked').notNull().default(false),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_webauthn_credentials_user').on(table.userId, table.isRevoked),
  ]
);

// ── WebAuthn Challenges (Phase 2) ─────────────────────────────────────────────
export const webauthnChallenges = pgTable(
  'webauthn_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    challenge: text('challenge').notNull(),
    type: text('type').notNull(), // 'registration' | 'authentication'
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_webauthn_challenges_lookup').on(table.challenge, table.expiresAt),
  ]
);

// ── Idempotency Keys (Phase 5) ────────────────────────────────────────────────
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    route: text('route').notNull(),
    clientKey: text('client_key').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status').notNull().default('processing'),
    statusCode: numeric('status_code'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_idempotency_lookup').on(table.householdId, table.userId, table.route, table.clientKey),
    index('idx_idempotency_expires').on(table.expiresAt),
  ]
);
