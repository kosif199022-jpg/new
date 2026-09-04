import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDataClient } from '@new/data';
import type { CorrelationId, RequestContext, TenantId, UserId } from '@new/shared';
import { createAccountService } from '../accounts/account-service.js';
import { createPayableService } from './payable-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for accounting integration tests');

const data = createDataClient(databaseUrl);
const tenantId = randomUUID() as TenantId;
const userId = randomUUID() as UserId;
const ctx: RequestContext = {
  tenantId,
  userId,
  correlationId: randomUUID() as CorrelationId,
  permissions: new Set(['accounting.post', 'payables.bill.issue'])
};

const accounts = createAccountService(data);
const payables = createPayableService(data);

describe('payable bills', () => {
  beforeAll(async () => {
    await data.sql`
      insert into tenants (id, slug, name)
      values (${tenantId}, ${`ap-${tenantId}`}, 'Payables Tenant')
    `;
    await data.sql`
      insert into users (id, external_subject, email, display_name)
      values (${userId}, ${`ap-subject-${userId}`}, ${`${userId}@example.test`}, 'Payables Tester')
    `;
  });

  afterAll(async () => {
    await data.close();
  });

  it('issues a vendor bill and posts the matching expense and payable journal', async () => {
    const payableAccount = await accounts.createAccount(ctx, {
      code: '2100',
      nameAr: 'الموردون',
      type: 'liability'
    });
    const expenseAccount = await accounts.createAccount(ctx, {
      code: '6100',
      nameAr: 'مصروف خدمات',
      type: 'expense'
    });

    const bill = await payables.issueBill(ctx, {
      billNumber: 'BILL-AP-001',
      vendorName: 'مورد تجريبي',
      currency: 'sar',
      amountMinor: 4800n,
      expenseAccountId: expenseAccount.id,
      payableAccountId: payableAccount.id
    });

    expect(bill).toMatchObject({
      billNumber: 'BILL-AP-001',
      vendorName: 'مورد تجريبي',
      currency: 'SAR',
      amountMinor: 4800n,
      status: 'issued'
    });
    expect(bill.journalId).toMatch(/^[0-9a-f-]{36}$/i);

    const journalLines = await data.sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx<{ code: string; debit_minor: string; credit_minor: string }[]>`
        select a.code, jl.debit_minor::text, jl.credit_minor::text
        from journal_lines jl
        join accounts a on a.id = jl.account_id and a.tenant_id = jl.tenant_id
        where jl.journal_id = ${bill.journalId}
        order by a.code
      `;
    });

    expect(journalLines).toEqual([
      { code: '2100', debit_minor: '0', credit_minor: '4800' },
      { code: '6100', debit_minor: '4800', credit_minor: '0' }
    ]);
  });

  it('keeps an issued vendor bill immutable', async () => {
    const payableAccount = await accounts.createAccount(ctx, {
      code: '2101',
      nameAr: 'موردون آخرون',
      type: 'liability'
    });
    const expenseAccount = await accounts.createAccount(ctx, {
      code: '6101',
      nameAr: 'مصروفات أخرى',
      type: 'expense'
    });

    const bill = await payables.issueBill(ctx, {
      billNumber: 'BILL-AP-002',
      vendorName: 'مورد ثابت',
      currency: 'SAR',
      amountMinor: 5200n,
      expenseAccountId: expenseAccount.id,
      payableAccountId: payableAccount.id
    });

    await expect(data.sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx`update payable_bills set vendor_name = 'mutated' where id = ${bill.id}`;
    })).rejects.toThrow(/immutable|append-only/i);
  });
});
