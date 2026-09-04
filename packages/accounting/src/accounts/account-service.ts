import { accounts, auditLog, withTenantTransaction, type DataClient } from '@new/data';
import { assertPermission, type RequestContext } from '@new/shared';
import type { Account, CreateAccountInput } from './types.js';

export interface AccountService {
  createAccount(ctx: RequestContext, input: CreateAccountInput): Promise<Account>;
}

export function createAccountService(data: DataClient): AccountService {
  return {
    async createAccount(ctx, input) {
      assertPermission(ctx, 'accounting.post');

      const code = input.code.trim();
      const nameAr = input.nameAr.trim();
      const nameEn = input.nameEn?.trim() || null;
      if (!code) throw new Error('account_code_required');
      if (!nameAr) throw new Error('account_name_ar_required');

      return withTenantTransaction(data.tenantRunner, ctx, async (tx) => {
        const [row] = await tx.insert(accounts).values({
          tenantId: ctx.tenantId,
          code,
          nameAr,
          nameEn,
          type: input.type,
          isActive: input.isActive ?? true
        }).returning({
          id: accounts.id,
          code: accounts.code,
          nameAr: accounts.nameAr,
          nameEn: accounts.nameEn,
          type: accounts.type,
          isActive: accounts.isActive
        });

        if (!row) throw new Error('account_create_failed');

        await tx.insert(auditLog).values({
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          action: 'accounting.account.created',
          resourceType: 'account',
          resourceId: row.id,
          correlationId: ctx.correlationId,
          metadata: { code: row.code, type: row.type }
        });

        return { ...row, type: row.type as Account['type'] };
      });
    }
  };
}
