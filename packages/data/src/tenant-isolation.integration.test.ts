import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres, { type Sql } from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite('tenant row-level isolation', () => {
  let sql: Sql;
  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '22222222-2222-4222-8222-222222222222';
  const userA = '33333333-3333-4333-8333-333333333333';
  const userB = '44444444-4444-4444-8444-444444444444';

  beforeAll(async () => {
    sql = postgres(databaseUrl!, { max: 1, prepare: false });
    await sql`insert into tenants (id, slug, name) values (${tenantA}, 'tenant-a', 'Tenant A'), (${tenantB}, 'tenant-b', 'Tenant B') on conflict do nothing`;
    await sql`insert into users (id, external_subject, email, display_name) values (${userA}, 'user-a', 'a@example.test', 'A'), (${userB}, 'user-b', 'b@example.test', 'B') on conflict do nothing`;

    await sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantA}, true)`;
      await tx`insert into memberships (id, tenant_id, user_id, permissions)
        values ('55555555-5555-4555-8555-555555555555', ${tenantA}, ${userA}, '[]'::jsonb)
        on conflict do nothing`;
    });
    await sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantB}, true)`;
      await tx`insert into memberships (id, tenant_id, user_id, permissions)
        values ('66666666-6666-4666-8666-666666666666', ${tenantB}, ${userB}, '[]'::jsonb)
        on conflict do nothing`;
    });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('runs integration queries as a non-privileged application role', async () => {
    const [role] = await sql<{ role_name: string; is_superuser: boolean; bypass_rls: boolean }[]>`
      select current_user as role_name, rolsuper as is_superuser, rolbypassrls as bypass_rls
      from pg_roles
      where rolname = current_user
    `;

    expect(role).toMatchObject({ is_superuser: false, bypass_rls: false });
  });

  it('restricts membership rows to the active tenant setting', async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantA}, true)`;
      return tx`select tenant_id::text as tenant_id from memberships order by tenant_id`;
    });
    expect(rows).toEqual([{ tenant_id: tenantA }]);
  });
});
