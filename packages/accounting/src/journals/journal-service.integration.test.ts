import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDataClient } from '@new/data';
import type { CorrelationId, RequestContext, TenantId, UserId } from '@new/shared';
import { createAccountService } from '../accounts/account-service.js';
import { createJournalService } from './journal-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for accounting integration tests');

const data = createDataClient(databaseUrl);
const tenantId = randomUUID() as TenantId;
const userId = randomUUID() as UserId;

const ctx: RequestContext = {
  tenantId,
  userId,
  correlationId: randomUUID() as CorrelationId,
  permissions: new Set(['accounting.read', 'accounting.post', 'accounting.reverse'])
};

const accounts = createAccountService(data);
const journals = createJournalService(data);

describe('journal posting', () => {
  beforeAll(async () => {
    await data.sql`
      insert into tenants (id, slug, name)
      values (${tenantId}, ${`finance-${tenantId}`}, 'Finance Integration Tenant')
    `;
    await data.sql`
      insert into users (id, external_subject, email, display_name)
      values (${userId}, ${`subject-${userId}`}, ${`${userId}@example.test`}, 'Finance Tester')
    `;
  });

  afterAll(async () => {
    await data.close();
  });

  it('posts only against active accounts and persists an immutable balanced journal', async () => {
    const cash = await accounts.createAccount(ctx, {
      code: '1000',
      nameAr: 'النقدية',
      type: 'asset',
      isActive: true
    });
    const sales = await accounts.createAccount(ctx, {
      code: '4000',
      nameAr: 'المبيعات',
      type: 'revenue',
      isActive: true
    });
    const inactive = await accounts.createAccount(ctx, {
      code: '4999',
      nameAr: 'حساب متوقف',
      type: 'revenue',
      isActive: false
    });

    await expect(journals.postJournal(ctx, {
      currency: 'SAR',
      memo: 'قيد على حساب متوقف',
      reference: 'POST-INACTIVE',
      lines: [
        { accountId: cash.id, debitMinor: 100n, creditMinor: 0n },
        { accountId: inactive.id, debitMinor: 0n, creditMinor: 100n }
      ]
    })).rejects.toThrow(/account_inactive/);

    const posted = await journals.postJournal(ctx, {
      currency: 'SAR',
      memo: 'بيع نقدي',
      reference: 'SALE-POST-001',
      lines: [
        { accountId: cash.id, debitMinor: 12500n, creditMinor: 0n },
        { accountId: sales.id, debitMinor: 0n, creditMinor: 12500n }
      ]
    });

    expect(posted.status).toBe('posted');
    expect(posted.totalMinor).toBe(12500n);

    await expect(data.sql.begin(async tx => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      await tx`update journal_entries set memo = 'mutated' where id = ${posted.id}`;
    })).rejects.toThrow(/immutable|append-only|mutation/i);
  });

  it('reverses by creating a linked journal with swapped debit and credit', async () => {
    const cash = await accounts.createAccount(ctx, {
      code: '1010',
      nameAr: 'الصندوق',
      type: 'asset',
      isActive: true
    });
    const expense = await accounts.createAccount(ctx, {
      code: '5100',
      nameAr: 'مصروف اختبار',
      type: 'expense',
      isActive: true
    });

    const original = await journals.postJournal(ctx, {
      currency: 'SAR',
      memo: 'مصروف',
      reference: 'EXP-001',
      lines: [
        { accountId: expense.id, debitMinor: 700n, creditMinor: 0n },
        { accountId: cash.id, debitMinor: 0n, creditMinor: 700n }
      ]
    });

    const reversal = await journals.reverseJournal(ctx, original.id, 'قيد مكرر');
    expect(reversal.reversesJournalId).toBe(original.id);
    expect(reversal.status).toBe('posted');

    const reversalLines = await data.sql.begin(async tx => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx<{
        account_id: string;
        debit_minor: string;
        credit_minor: string;
      }[]>`
        select account_id, debit_minor::text, credit_minor::text
        from journal_lines
        where journal_id = ${reversal.id}
        order by account_id
      `;
    });

    const originalLines = await data.sql.begin(async tx => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx<{
        account_id: string;
        debit_minor: string;
        credit_minor: string;
      }[]>`
        select account_id, debit_minor::text, credit_minor::text
        from journal_lines
        where journal_id = ${original.id}
        order by account_id
      `;
    });

    expect(reversalLines).toEqual(originalLines.map(line => ({
      account_id: line.account_id,
      debit_minor: line.credit_minor,
      credit_minor: line.debit_minor
    })));
  });
});
