begin;

create table if not exists tenants (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  external_subject text not null unique,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id) on delete restrict,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  correlation_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table memberships enable row level security;
alter table memberships force row level security;
alter table audit_log enable row level security;
alter table audit_log force row level security;

drop policy if exists memberships_tenant_policy on memberships;
create policy memberships_tenant_policy on memberships
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists audit_log_tenant_policy on audit_log;
create policy audit_log_tenant_policy on audit_log
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create or replace function prevent_audit_log_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

drop trigger if exists audit_log_no_update on audit_log;
create trigger audit_log_no_update before update or delete on audit_log
for each row execute function prevent_audit_log_mutation();

commit;
