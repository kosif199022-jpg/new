create table if not exists receivable_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  invoice_id uuid not null references receivable_invoices(id) on delete restrict,
  reference text not null,
  currency text not null,
  amount_minor bigint not null,
  cash_account_id uuid not null references accounts(id) on delete restrict,
  journal_id uuid not null references journal_entries(id) on delete restrict,
  received_by uuid not null references users(id) on delete restrict,
  received_at timestamptz not null default now(),
  correlation_id text not null,
  constraint receivable_receipts_amount_positive_ck check (amount_minor > 0),
  constraint receivable_receipts_tenant_reference_uq unique (tenant_id, reference),
  constraint receivable_receipts_journal_uq unique (journal_id)
);

create index if not exists receivable_receipts_invoice_idx
  on receivable_receipts (tenant_id, invoice_id, received_at);

alter table receivable_receipts enable row level security;
alter table receivable_receipts force row level security;

drop policy if exists receivable_receipts_tenant_policy on receivable_receipts;
create policy receivable_receipts_tenant_policy on receivable_receipts
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create or replace function new_prevent_receivable_receipt_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'receivable receipts are immutable; append-only mutation denied';
end;
$$;

drop trigger if exists receivable_receipts_no_mutation on receivable_receipts;
create trigger receivable_receipts_no_mutation
before update or delete on receivable_receipts
for each row execute function new_prevent_receivable_receipt_mutation();
