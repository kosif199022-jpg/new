import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDataClient } from '@new/data';
import type { CorrelationId, RequestContext, TenantId, UserId } from '@new/shared';
import { createAccountService } from '../accounts/account-service.js';
import { createReceivableService } from './receivable-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for accounting integration tests');

const data = createDataClient(databaseUrl);
const tenantId = randomUUID() as TenantId;
const userId = randomUUID() as UserId;
const ctx: RequestContext = {
  tenantId,
  userId,
  correlationId: randomUUID() as CorrelationId,
  permissions: new Set(['accounting.post', 'receivables.invoice.issue'])
};

const accounts = createAccountService(data);
const receivables = createReceivableService(data);

describe('receivable invoices', () => {
  beforeAll(async () => {
    await data.sql`
      insert into tenants (id, slug, name)
      values (${tenantId}, ${`ar-${tenantId}`}, 'Receivables Tenant')
    `;
    await data.sql`
      insert into users (id, external_subject, email, display_name)
      values (${userId}, ${`ar-subject-${userId}`}, ${`${userId}@example.test`}, 'Receivables Tester')
    `;
  });

  afterAll(async () => {
    await data.close();
  });

  it('issues an invoice and posts the matching receivable and revenue journal', async () => {
    const receivableAccount = await accounts.createAccount(ctx, {
      code: '1200',
      nameAr: 'العملاء',
      type: 'asset'
    });
    const revenueAccount = await accounts.createAccount(ctx, {
      code: '4200',
      nameAr: 'إيرادات المبيعات',
      type: 'revenue'
    });

    const invoice = await receivables.issueInvoice(ctx, {
      invoiceNumber: 'INV-AR-001',
      customerName: 'عميل تجريبي',
      currency: 'sar',
      amountMinor: 1500n,
      receivableAccountId: receivableAccount.id,
      revenueAccountId: revenueAccount.id
    });

    expect(invoice).toMatchObject({
      invoiceNumber: 'INV-AR-001',
      customerName: 'عميل تجريبي',
      currency: 'SAR',
      amountMinor: 1500n,
      status: 'issued'
    });
    expect(invoice.journalId).toMatch(/^[0-9a-f-]{36}$/i);

    const journalLines = await data.sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx<{ code: string; debit_minor: string; credit_minor: string }[]>`
        select a.code, jl.debit_minor::text, jl.credit_minor::text
        from journal_lines jl
        join accounts a on a.id = jl.account_id and a.tenant_id = jl.tenant_id
        where jl.journal_id = ${invoice.journalId}
        order by a.code
      `;
    });

    expect(journalLines).toEqual([
      { code: '1200', debit_minor: '1500', credit_minor: '0' },
      { code: '4200', debit_minor: '0', credit_minor: '1500' }
    ]);
  });

  it('keeps an issued invoice immutable', async () => {
    const receivableAccount = await accounts.createAccount(ctx, {
      code: '1201',
      nameAr: 'عملاء آخرون',
      type: 'asset'
    });
    const revenueAccount = await accounts.createAccount(ctx, {
      code: '4201',
      nameAr: 'إيرادات أخرى',
      type: 'revenue'
    });

    const invoice = await receivables.issueInvoice(ctx, {
      invoiceNumber: 'INV-AR-002',
      customerName: 'عميل ثابت',
      currency: 'SAR',
      amountMinor: 2500n,
      receivableAccountId: receivableAccount.id,
      revenueAccountId: revenueAccount.id
    });

    await expect(data.sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx`update receivable_invoices set customer_name = 'mutated' where id = ${invoice.id}`;
    })).rejects.toThrow(/immutable|append-only/i);
  });
});
