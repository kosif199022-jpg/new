import type { RequestContext } from '@new/shared';

export interface TenantTransactionState<TDb> {
  db: TDb;
  setTenant(tenantId: string): Promise<void>;
}

export interface TenantTransactionRunner<TDb> {
  transaction<T>(callback: (state: TenantTransactionState<TDb>) => Promise<T>): Promise<T>;
}

export async function withTenantTransaction<TDb, TResult>(
  runner: TenantTransactionRunner<TDb>,
  ctx: RequestContext,
  callback: (db: TDb) => Promise<TResult>
): Promise<TResult> {
  return runner.transaction(async (state) => {
    await state.setTenant(ctx.tenantId);
    return callback(state.db);
  });
}
