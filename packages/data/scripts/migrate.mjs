import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = postgres(databaseUrl, { max: 1, prepare: false });
await sql.unsafe(`create table if not exists _new_migrations (
  filename text primary key,
  sha256 text not null,
  applied_at timestamptz not null default now()
)`);

try {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  for (const filename of files) {
    const body = await readFile(join(migrationsDir, filename), 'utf8');
    const sha256 = createHash('sha256').update(body).digest('hex');
    const [existing] = await sql`select sha256 from _new_migrations where filename = ${filename}`;
    if (existing) {
      if (existing.sha256 !== sha256) throw new Error(`Applied migration changed: ${filename}`);
      continue;
    }
    await sql.unsafe(body);
    await sql`insert into _new_migrations (filename, sha256) values (${filename}, ${sha256})`;
    console.log(`Applied ${filename}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
