import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDataClient } from '@new/data';
import type { CorrelationId, RequestContext, TenantId, UserId } from '@new/shared';
import { createAccountService } from '../accounts/account-service.js';
import { createJournalService } from '../journals/journal-service.js';
import { createTrialBalanceService } from './trial-balance-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for accounting integration tests');

const data = createDataClient(databaseUrl);
const tenantId = randomUUID() as TenantId;
const userId = randomUUID() as UserId;
const ctx: RequestContext = {
  tenantId,
  userId,
  correlationId: randomUUID() as CorrelationId,
  permissions: new Set(['accounting.read', 'accounting.post'])
};

const accounts = createAccountService(data);
const journals = createJournalService(data);
const trialBalance = createTrialBalanceService(data);

describe('trial balance', () => {
  beforeAll(async () => {
    await data.sql`
      insert into tenants (id, slug, name)
      values (${tenantId}, ${`trial-${tenantId}`}, 'Trial Balance Tenant')
    `;
    await data.sql`
      insert into users (id, external_subject, email, display_name)
      values (${userId}, ${`trial-subject-${userId}`}, ${`${userId}@example.test`}, 'Trial Balance Tester')
    `;
  });

  afterAll(async () => {
    await data.close();
  });

  it('aggregates posted activity into balanced debit and credit account balances', async () => {
    const cash = await accounts.createAccount(ctx, {
      code: '1100',
      nameAr: 'النقدية',
      type: 'asset'
    });
    const sales = await accounts.createAccount(ctx, {
      code: '4100',
      nameAr: 'الإيرادات',
      type: 'revenue'
    });
    const expense = await accounts.createAccount(ctx, {
      code: '5100',
      nameAr: 'المصروفات',
      type: 'expense'
    });

    await journals.postJournal(ctx, {
      currency: 'SAR',
      memo: 'بيع نقدي',
      reference: 'TB-SALE-001',
      lines: [
        { accountId: cash.id, debitMinor: 1000n, creditMinor: 0n },
        { accountId: sales.id, debitMinor: 0n, creditMinor: 1000n }
      ]
    });

    await journals.postJournal(ctx, {
      currency: 'SAR',
      memo: 'مصروف نقدي',
      reference: 'TB-EXP-001',
      lines: [
        { accountId: expense.id, debitMinor: 250n, creditMinor: 0n },
        { accountId: cash.id, debitMinor: 0n, creditMinor: 250n }
      ]
    });

    const report = await trialBalance.getTrialBalance(ctx);

    expect(report.rows).toEqual([
      {
        accountId: cash.id,
        code: '1100',
        nameAr: 'النقدية',
        type: 'asset',
        debitActivityMinor: 1000n,
        creditActivityMinor: 250n,
        debitBalanceMinor: 750n,
        creditBalanceMinor: 0n
      },
      {
        accountId: sales.id,
        code: '4100',
        nameAr: 'الإيرادات',
        type: 'revenue',
        debitActivityMinor: 0n,
        creditActivityMinor: 1000n,
        debitBalanceMinor: 0n,
        creditBalanceMinor: 1000n
      },
      {
        accountId: expense.id,
        code: '5100',
        nameAr: 'المصروفات',
        type: 'expense',
        debitActivityMinor: 250n,
        creditActivityMinor: 0n,
        debitBalanceMinor: 250n,
        creditBalanceMinor: 0n
      }
    ]);
    expect(report.totalDebitBalanceMinor).toBe(1000n);
    expect(report.totalCreditBalanceMinor).toBe(1000n);
  });
});
