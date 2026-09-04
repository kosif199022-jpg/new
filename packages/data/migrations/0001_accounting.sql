create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  currency text not null,
  memo text not null,
  reference text not null,
  status text not null default 'posted' check (status = 'posted'),
  total_minor bigint not null check (total_minor >= 0),
  reverses_journal_id uuid references journal_entries(id) on delete restrict,
  posted_by uuid not null references users(id) on delete restrict,
  posted_at timestamptz not null default now(),
  correlation_id text not null
);

create index if not exists journal_entries_tenant_posted_idx on journal_entries (tenant_id, posted_at);
create index if not exists journal_entries_reverses_idx on journal_entries (reverses_journal_id);

create table if not exists journal_lines (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id) on delete restrict,
  journal_id uuid not null references journal_entries(id) on delete restrict,
  account_id uuid not null references accounts(id) on delete restrict,
  debit_minor bigint not null check (debit_minor >= 0),
  credit_minor bigint not null check (credit_minor >= 0),
  constraint journal_lines_one_side_ck check (((debit_minor > 0)::int + (credit_minor > 0)::int) = 1)
);

create index if not exists journal_lines_journal_idx on journal_lines (journal_id);
create index if not exists journal_lines_account_idx on journal_lines (tenant_id, account_id);

alter table accounts enable row level security;
alter table accounts force row level security;
alter table journal_entries enable row level security;
alter table journal_entries force row level security;
alter table journal_lines enable row level security;
alter table journal_lines force row level security;

drop policy if exists accounts_tenant_policy on accounts;
create policy accounts_tenant_policy on accounts
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists journal_entries_tenant_policy on journal_entries;
create policy journal_entries_tenant_policy on journal_entries
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists journal_lines_tenant_policy on journal_lines;
create policy journal_lines_tenant_policy on journal_lines
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create or replace function new_prevent_posted_journal_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'posted journal rows are immutable; append-only mutation denied';
end;
$$;

drop trigger if exists journal_entries_no_mutation on journal_entries;
create trigger journal_entries_no_mutation
before update or delete on journal_entries
for each row execute function new_prevent_posted_journal_mutation();

drop trigger if exists journal_lines_no_mutation on journal_lines;
create trigger journal_lines_no_mutation
before update or delete on journal_lines
for each row execute function new_prevent_posted_journal_mutation();
