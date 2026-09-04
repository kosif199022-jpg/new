import { describe, expect, it } from 'vitest';
import { correlationId, tenantId, userId, type RequestContext } from '@new/shared';
import { withTenantTransaction, type TenantTransactionRunner } from './tenant-transaction.js';

const ctx: RequestContext = {
  tenantId: tenantId('11111111-1111-4111-8111-111111111111'),
  userId: userId('22222222-2222-4222-8222-222222222222'),
  correlationId: correlationId('corr-1'),
  permissions: new Set()
};

describe('withTenantTransaction', () => {
  it('sets tenant context before executing the callback', async () => {
    const calls: string[] = [];
    const db = { name: 'fake-db' };
    const runner: TenantTransactionRunner<typeof db> = {
      transaction: async (callback) => callback({
        db,
        setTenant: async (id) => { calls.push(id); }
      })
    };

    const result = await withTenantTransaction(runner, ctx, async (txDb) => txDb.name);
    expect(result).toBe('fake-db');
    expect(calls).toEqual([ctx.tenantId]);
  });
});
