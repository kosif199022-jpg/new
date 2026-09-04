import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDataClient } from '@new/data';
import type { CorrelationId, RequestContext, TenantId, UserId } from '@new/shared';
import { createAccountService } from '../accounts/account-service.js';
import { createReceivableService } from './receivable-service.js';
import { createReceivableReceiptService } from './receivable-receipt-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for accounting integration tests');

const data = createDataClient(databaseUrl);
const tenantId = randomUUID() as TenantId;
const userId = randomUUID() as UserId;
const ctx: RequestContext = {
  tenantId,
  userId,
  correlationId: randomUUID() as CorrelationId,
  permissions: new Set([
    'accounting.post',
    'receivables.invoice.issue',
    'receivables.receipt.record',
    'receivables.read'
  ])
};

const accounts = createAccountService(data);
const receivables = createReceivableService(data);
const receipts = createReceivableReceiptService(data);

describe('receivable receipts', () => {
  beforeAll(async () => {
    await data.sql`
      insert into tenants (id, slug, name)
      values (${tenantId}, ${`receipt-${tenantId}`}, 'Receivable Receipt Tenant')
    `;
    await data.sql`
      insert into users (id, external_subject, email, display_name)
      values (${userId}, ${`receipt-subject-${userId}`}, ${`${userId}@example.test`}, 'Receivable Receipt Tester')
    `;
  });

  afterAll(async () => {
    await data.close();
  });

  it('records partial and final receipts as balanced journals and derives invoice status', async () => {
    const cash = await accounts.createAccount(ctx, {
      code: '1110',
      nameAr: 'البنك',
      type: 'asset'
    });
    const receivable = await accounts.createAccount(ctx, {
      code: '1210',
      nameAr: 'العملاء',
      type: 'asset'
    });
    const revenue = await accounts.createAccount(ctx, {
      code: '4210',
      nameAr: 'إيرادات الخدمات',
      type: 'revenue'
    });

    const invoice = await receivables.issueInvoice(ctx, {
      invoiceNumber: 'INV-REC-001',
      customerName: 'عميل التحصيل',
      currency: 'SAR',
      amountMinor: 3000n,
      receivableAccountId: receivable.id,
      revenueAccountId: revenue.id
    });

    const first = await receipts.recordReceipt(ctx, {
      invoiceId: invoice.id,
      cashAccountId: cash.id,
      amountMinor: 1200n,
      reference: 'RCPT-001'
    });

    expect(first).toMatchObject({
      invoiceId: invoice.id,
      amountMinor: 1200n,
      currency: 'SAR'
    });

    const firstBalance = await receipts.getInvoiceBalance(ctx, invoice.id);
    expect(firstBalance).toEqual({
      invoiceId: invoice.id,
      originalAmountMinor: 3000n,
      paidAmountMinor: 1200n,
      outstandingAmountMinor: 1800n,
      status: 'partially_paid'
    });

    const receiptLines = await data.sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx<{ code: string; debit_minor: string; credit_minor: string }[]>`
        select a.code, jl.debit_minor::text, jl.credit_minor::text
        from journal_lines jl
        join accounts a on a.id = jl.account_id and a.tenant_id = jl.tenant_id
        where jl.journal_id = ${first.journalId}
        order by a.code
      `;
    });

    expect(receiptLines).toEqual([
      { code: '1110', debit_minor: '1200', credit_minor: '0' },
      { code: '1210', debit_minor: '0', credit_minor: '1200' }
    ]);

    await receipts.recordReceipt(ctx, {
      invoiceId: invoice.id,
      cashAccountId: cash.id,
      amountMinor: 1800n,
      reference: 'RCPT-002'
    });

    expect(await receipts.getInvoiceBalance(ctx, invoice.id)).toEqual({
      invoiceId: invoice.id,
      originalAmountMinor: 3000n,
      paidAmountMinor: 3000n,
      outstandingAmountMinor: 0n,
      status: 'paid'
    });

    await expect(receipts.recordReceipt(ctx, {
      invoiceId: invoice.id,
      cashAccountId: cash.id,
      amountMinor: 1n,
      reference: 'RCPT-003'
    })).rejects.toThrow(/overpayment|invoice_paid/i);
  });
});
