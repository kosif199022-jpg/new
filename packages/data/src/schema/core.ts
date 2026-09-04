import { bigint, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
}, (table) => [uniqueIndex('tenants_slug_uq').on(table.slug)]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  externalSubject: text('external_subject').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
}, (table) => [uniqueIndex('users_external_subject_uq').on(table.externalSubject)]);

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
}, (table) => [uniqueIndex('memberships_tenant_user_uq').on(table.tenantId, table.userId)]);

export const auditLog = pgTable('audit_log', {
  id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  correlationId: text('correlation_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
});
