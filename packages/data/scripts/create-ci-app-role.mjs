import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
const role = process.env.CI_APP_DB_ROLE ?? 'new_app';
const password = process.env.CI_APP_DB_PASSWORD ?? 'new-app-local-only';

if (!databaseUrl) throw new Error('DATABASE_ADMIN_URL or DATABASE_URL is required');
if (!/^[a-z_][a-z0-9_]*$/i.test(role)) throw new Error('Invalid CI database role name');

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const quotedRole = `"${role.replaceAll('"', '""')}"`;
const quotedPassword = `'${password.replaceAll("'", "''")}'`;

try {
  const existing = await sql<{ exists: boolean }[]>`
    select exists(select 1 from pg_roles where rolname = ${role}) as exists
  `;

  if (!existing[0]?.exists) {
    await sql.unsafe(`create role ${quotedRole} login password ${quotedPassword} nosuperuser nocreatedb nocreaterole noinherit nobypassrls`);
  } else {
    await sql.unsafe(`alter role ${quotedRole} with login password ${quotedPassword} nosuperuser nocreatedb nocreaterole noinherit nobypassrls`);
  }

  await sql.unsafe(`grant usage on schema public to ${quotedRole}`);
  await sql.unsafe(`grant select, insert, update, delete on all tables in schema public to ${quotedRole}`);
  await sql.unsafe(`grant usage, select on all sequences in schema public to ${quotedRole}`);
} finally {
  await sql.end({ timeout: 5 });
}
