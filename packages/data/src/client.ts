import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as accountingSchema from './schema/accounting.js';
import * as coreSchema from './schema/core.js';
import type { TenantTransactionRunner } from './tenant-transaction.js';

const schema = { ...coreSchema, ...accountingSchema };

export type AppDatabase = PostgresJsDatabase<typeof schema>;
export type AppTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

export interface DataClient {
  readonly sql: Sql;
  readonly db: AppDatabase;
  readonly tenantRunner: TenantTransactionRunner<AppTransaction>;
  close(): Promise<void>;
}

export function createDataClient(databaseUrl: string): DataClient {
  const queryClient = postgres(databaseUrl, { max: 10, prepare: false });
  const db = drizzle({ client: queryClient, schema });

  const tenantRunner: TenantTransactionRunner<AppTransaction> = {
    transaction: async <T>(callback: (state: { db: AppTransaction; setTenant(tenantId: string): Promise<void> }) => Promise<T>): Promise<T> =>
      db.transaction(async (tx) => callback({
        db: tx,
        setTenant: async (tenantId: string) => {
          await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
        }
      }))
  };

  return {
    sql: queryClient,
    db,
    tenantRunner,
    close: async () => queryClient.end({ timeout: 5 })
  };
}
