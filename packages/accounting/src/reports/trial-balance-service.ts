import { and, eq, sql } from 'drizzle-orm';
import {
  accounts,
  journalEntries,
  journalLines,
  withTenantTransaction,
  type DataClient
} from '@new/data';
import { assertPermission, type RequestContext } from '@new/shared';
import type { AccountType } from '../accounts/types.js';

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  nameAr: string;
  type: AccountType;
  debitActivityMinor: bigint;
  creditActivityMinor: bigint;
  debitBalanceMinor: bigint;
  creditBalanceMinor: bigint;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebitBalanceMinor: bigint;
  totalCreditBalanceMinor: bigint;
}

export interface TrialBalanceService {
  getTrialBalance(ctx: RequestContext): Promise<TrialBalanceReport>;
}

export function createTrialBalanceService(data: DataClient): TrialBalanceService {
  return {
    async getTrialBalance(ctx) {
      assertPermission(ctx, 'accounting.read');

      return withTenantTransaction(data.tenantRunner, ctx, async (tx) => {
        const activityRows = await tx.select({
          accountId: accounts.id,
          code: accounts.code,
          nameAr: accounts.nameAr,
          type: accounts.type,
          debitActivityMinor: sql<bigint>`sum(${journalLines.debitMinor})::bigint`,
          creditActivityMinor: sql<bigint>`sum(${journalLines.creditMinor})::bigint`
        })
          .from(journalLines)
          .innerJoin(accounts, and(
            eq(accounts.id, journalLines.accountId),
            eq(accounts.tenantId, journalLines.tenantId)
          ))
          .innerJoin(journalEntries, and(
            eq(journalEntries.id, journalLines.journalId),
            eq(journalEntries.tenantId, journalLines.tenantId)
          ))
          .where(and(
            eq(journalLines.tenantId, ctx.tenantId),
            eq(journalEntries.status, 'posted')
          ))
          .groupBy(accounts.id, accounts.code, accounts.nameAr, accounts.type)
          .orderBy(accounts.code);

        const rows = activityRows.map<TrialBalanceRow>((row) => {
          const netMinor = row.debitActivityMinor - row.creditActivityMinor;
          return {
            accountId: row.accountId,
            code: row.code,
            nameAr: row.nameAr,
            type: row.type as AccountType,
            debitActivityMinor: row.debitActivityMinor,
            creditActivityMinor: row.creditActivityMinor,
            debitBalanceMinor: netMinor > 0n ? netMinor : 0n,
            creditBalanceMinor: netMinor < 0n ? -netMinor : 0n
          };
        });

        return {
          rows,
          totalDebitBalanceMinor: rows.reduce((total, row) => total + row.debitBalanceMinor, 0n),
          totalCreditBalanceMinor: rows.reduce((total, row) => total + row.creditBalanceMinor, 0n)
        };
      });
    }
  };
}
