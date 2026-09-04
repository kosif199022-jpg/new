import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema/core.js';
import type { TenantTransactionRunner } from './tenant-transaction.js';

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export interface DataClient {
  readonly sql: Sql;
  readonly db: AppDatabase;
  readonly tenantRunner: TenantTransactionRunner<AppDatabase>;
  close(): Promise<void>;
}

export function createDataClient(databaseUrl: string): DataClient {
  const sql = postgres(databaseUrl, { max: 10, prepare: false });
  const db = drizzle(sql, { schema });

  const tenantRunner: TenantTransactionRunner<AppDatabase> = {
    transaction: async <T>(callback: (state: { db: AppDatabase; setTenant(tenantId: string): Promise<void> }) => Promise<T>): Promise<T> =>
      sql.begin(async (tx) => {
        const txDb = drizzle(tx, { schema });
        return callback({
          db: txDb,
          setTenant: async (tenantId: string) => {
            await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
          }
        });
      })
  };

  return {
    sql,
    db,
    tenantRunner,
    close: async () => sql.end({ timeout: 5 })
  };
}
