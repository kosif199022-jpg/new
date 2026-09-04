import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenants, users } from './core.js';

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  code: text('code').notNull(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en'),
  type: text('type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('accounts_tenant_code_uq').on(table.tenantId, table.code),
  check('accounts_type_ck', sql`${table.type} in ('asset','liability','equity','revenue','expense')`)
]);

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  currency: text('currency').notNull(),
  memo: text('memo').notNull(),
  reference: text('reference').notNull(),
  status: text('status').notNull().default('posted'),
  totalMinor: bigint('total_minor', { mode: 'bigint' }).notNull(),
  reversesJournalId: uuid('reverses_journal_id'),
  postedBy: uuid('posted_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  postedAt: timestamp('posted_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  correlationId: text('correlation_id').notNull()
}, (table) => [
  index('journal_entries_tenant_posted_idx').on(table.tenantId, table.postedAt),
  index('journal_entries_reverses_idx').on(table.reversesJournalId),
  check('journal_entries_status_ck', sql`${table.status} = 'posted'`),
  check('journal_entries_total_nonnegative_ck', sql`${table.totalMinor} >= 0`)
]);

export const journalLines = pgTable('journal_lines', {
  id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  journalId: uuid('journal_id').notNull().references(() => journalEntries.id, { onDelete: 'restrict' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  debitMinor: bigint('debit_minor', { mode: 'bigint' }).notNull(),
  creditMinor: bigint('credit_minor', { mode: 'bigint' }).notNull()
}, (table) => [
  index('journal_lines_journal_idx').on(table.journalId),
  index('journal_lines_account_idx').on(table.tenantId, table.accountId),
  check('journal_lines_nonnegative_ck', sql`${table.debitMinor} >= 0 and ${table.creditMinor} >= 0`),
  check('journal_lines_one_side_ck', sql`((${table.debitMinor} > 0)::int + (${table.creditMinor} > 0)::int) = 1`)
]);

export const receivableInvoices = pgTable('receivable_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  invoiceNumber: text('invoice_number').notNull(),
  customerName: text('customer_name').notNull(),
  currency: text('currency').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  receivableAccountId: uuid('receivable_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  revenueAccountId: uuid('revenue_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  journalId: uuid('journal_id').notNull().references(() => journalEntries.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('issued'),
  issuedBy: uuid('issued_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  correlationId: text('correlation_id').notNull()
}, (table) => [
  uniqueIndex('receivable_invoices_tenant_number_uq').on(table.tenantId, table.invoiceNumber),
  uniqueIndex('receivable_invoices_journal_uq').on(table.journalId),
  index('receivable_invoices_tenant_issued_idx').on(table.tenantId, table.issuedAt),
  check('receivable_invoices_amount_positive_ck', sql`${table.amountMinor} > 0`),
  check('receivable_invoices_status_ck', sql`${table.status} = 'issued'`)
]);

export const receivableReceipts = pgTable('receivable_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  invoiceId: uuid('invoice_id').notNull().references(() => receivableInvoices.id, { onDelete: 'restrict' }),
  reference: text('reference').notNull(),
  currency: text('currency').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  cashAccountId: uuid('cash_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  journalId: uuid('journal_id').notNull().references(() => journalEntries.id, { onDelete: 'restrict' }),
  receivedBy: uuid('received_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  receivedAt: timestamp('received_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  correlationId: text('correlation_id').notNull()
}, (table) => [
  uniqueIndex('receivable_receipts_tenant_reference_uq').on(table.tenantId, table.reference),
  uniqueIndex('receivable_receipts_journal_uq').on(table.journalId),
  index('receivable_receipts_invoice_idx').on(table.tenantId, table.invoiceId, table.receivedAt),
  check('receivable_receipts_amount_positive_ck', sql`${table.amountMinor} > 0`)
]);
