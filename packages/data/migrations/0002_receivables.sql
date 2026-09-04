create table if not exists receivable_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  invoice_number text not null,
  customer_name text not null,
  currency text not null,
  amount_minor bigint not null,
  receivable_account_id uuid not null references accounts(id) on delete restrict,
  revenue_account_id uuid not null references accounts(id) on delete restrict,
  journal_id uuid not null references journal_entries(id) on delete restrict,
  status text not null default 'issued',
  issued_by uuid not null references users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  correlation_id text not null,
  constraint receivable_invoices_amount_positive_ck check (amount_minor > 0),
  constraint receivable_invoices_status_ck check (status = 'issued'),
  constraint receivable_invoices_tenant_number_uq unique (tenant_id, invoice_number),
  constraint receivable_invoices_journal_uq unique (journal_id)
);

create index if not exists receivable_invoices_tenant_issued_idx
  on receivable_invoices (tenant_id, issued_at);

alter table receivable_invoices enable row level security;
alter table receivable_invoices force row level security;

drop policy if exists receivable_invoices_tenant_policy on receivable_invoices;
create policy receivable_invoices_tenant_policy on receivable_invoices
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create or replace function new_prevent_issued_invoice_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'issued receivable invoices are immutable; append-only mutation denied';
end;
$$;

drop trigger if exists receivable_invoices_no_mutation on receivable_invoices;
create trigger receivable_invoices_no_mutation
before update or delete on receivable_invoices
for each row execute function new_prevent_issued_invoice_mutation();
