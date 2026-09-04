# NEW Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic accounting, import, reconciliation, analytics, statements and reporting core that becomes the authoritative financial engine of NEW.

**Architecture:** Keep authoritative accounting rules in domain packages with no UI/AI dependency. API handlers call application services with tenant/request context; reports and heavy imports use worker jobs, while all mutations preserve immutable posting/reversal semantics and traceability.

**Tech Stack:** TypeScript, Zod, Drizzle/PostgreSQL, decimal.js or integer minor units, Vitest, fast-check, BullMQ, ExcelJS, PDF generation adapter, React client consumers.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Money is exact; authoritative postings never use binary floating point.
- Posted journal batches are immutable; correction is reversal/adjustment only.
- AI cannot directly post, reverse, approve or mutate canonical financial records.
- Every financial mutation is tenant-scoped, permission-checked and audit-logged.
- Imports are staged and validated before canonical data changes.
- Arabic labels are first-class while account/report identifiers remain stable semantic keys.

---

## File structure map

```text
packages/accounting/src/{accounts,journals,ledger,receivables,payables,assets,inventory,close}/*
packages/import/src/*
packages/reconciliation/src/*
packages/analytics/src/*
packages/statements/src/*
packages/reporting/src/*
apps/api/src/routes/{accounting,reconciliation,analytics,statements,reports}.ts
apps/worker/src/jobs/{imports,reports}.ts
apps/web/src/features/{accounting,reconciliation,analytics,statements,reports}/*
```

### Task 1: Implement chart of accounts and balanced journals

**Files:**
- Create: `packages/accounting/src/accounts/types.ts`
- Create: `packages/accounting/src/accounts/account-service.ts`
- Create: `packages/accounting/src/journals/types.ts`
- Create: `packages/accounting/src/journals/validate-journal.ts`
- Create: `packages/accounting/src/journals/journal-service.ts`
- Test: `packages/accounting/src/journals/validate-journal.test.ts`
- Test: `packages/accounting/src/journals/journal-service.integration.test.ts`
- Create: `packages/data/src/schema/accounting.ts`
- Create: `packages/data/migrations/0001_accounting.sql`

**Interfaces:**
- Consumes: `RequestContext`, `Money`, tenant transaction boundary.
- Produces: `Account`, `JournalDraft`, `validateJournal(draft)`, `postJournal(ctx,draft)`, `reverseJournal(ctx,journalId,reason)`.

- [ ] **Step 1: Write failing balance tests**

```ts
it('rejects a journal when debits do not equal credits', () => {
  const result = validateJournal({currency:'SAR', lines:[
    {accountId:'cash', debitMinor:100n, creditMinor:0n},
    {accountId:'sales', debitMinor:0n, creditMinor:90n},
  ]});
  expect(result.ok).toBe(false);
});
```

- [ ] **Step 2: Implement journal invariants**

Require at least two lines, exactly one side per line, non-negative amounts, total debit equals total credit, active accounts, consistent currency and non-empty memo/reference metadata.

- [ ] **Step 3: Add posting persistence**

Persist immutable header/lines with `status='posted'`, `posted_by`, `posted_at`, `correlation_id`; reject updates to posted rows at service level and DB trigger level.

- [ ] **Step 4: Add governed reversal**

`reverseJournal()` requires `accounting.reverse`, creates a new linked journal with swapped debit/credit amounts and stores the reason; original remains unchanged.

- [ ] **Step 5: Run property tests**

Use fast-check to generate balanced journals and assert ledger conservation; run `pnpm --filter @new/accounting test`.

- [ ] **Step 6: Commit**

```bash
git add packages/accounting packages/data/src/schema/accounting.ts packages/data/migrations/0001_accounting.sql
git commit -m "feat: add immutable balanced journal engine"
```

### Task 2: Implement trial balance, general ledger, AR and AP

**Files:**
- Create: `packages/accounting/src/ledger/ledger-service.ts`
- Create: `packages/accounting/src/ledger/trial-balance.ts`
- Create: `packages/accounting/src/receivables/invoice-service.ts`
- Create: `packages/accounting/src/payables/bill-service.ts`
- Test: `packages/accounting/src/ledger/trial-balance.test.ts`
- Test: `packages/accounting/src/receivables/invoice-service.test.ts`
- Modify: `packages/data/src/schema/accounting.ts`
- Create: `apps/api/src/routes/accounting.ts`

**Interfaces:**
- Consumes: posted journals and account hierarchy.
- Produces: `getLedger(ctx,query)`, `getTrialBalance(ctx,period)`, `createCustomerInvoice()`, `createSupplierBill()`, aging source records.

- [ ] **Step 1: Write failing trial balance test**

```ts
it('returns equal total debit and credit from posted journals only', async () => {
  const tb = await getTrialBalance(ctx, {from:'2026-01-01', to:'2026-12-31'});
  expect(tb.totalDebitMinor).toBe(tb.totalCreditMinor);
  expect(tb.rows.every(r => r.accountId)).toBe(true);
});
```

- [ ] **Step 2: Implement ledger queries**

Support account/date/entity/dimension filters, opening balance, movement and closing balance with stable pagination.

- [ ] **Step 3: Implement invoice/bill state machines**

States: `draft -> approved -> posted -> partially_paid/paid -> voided`; only posting creates canonical journals and only authorized reversal can undo them.

- [ ] **Step 4: Add API routes**

Expose read endpoints for chart/ledger/trial balance and governed mutation endpoints for invoices/bills/journals with Zod schemas and permission guards.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @new/accounting test && pnpm --filter @new/api test`.

- [ ] **Step 6: Commit**

```bash
git add packages/accounting apps/api/src/routes/accounting.ts packages/data/src/schema/accounting.ts
git commit -m "feat: add ledger receivables and payables"
```

### Task 3: Implement assets, inventory, dimensions and close readiness

**Files:**
- Create: `packages/accounting/src/assets/depreciation.ts`
- Create: `packages/accounting/src/assets/asset-service.ts`
- Create: `packages/accounting/src/inventory/weighted-average.ts`
- Create: `packages/accounting/src/inventory/inventory-service.ts`
- Create: `packages/accounting/src/close/close-readiness.ts`
- Test: `packages/accounting/src/assets/depreciation.test.ts`
- Test: `packages/accounting/src/inventory/weighted-average.test.ts`
- Test: `packages/accounting/src/close/close-readiness.test.ts`

**Interfaces:**
- Consumes: exact Money and journal posting interfaces.
- Produces: depreciation schedules, inventory valuation movements, close blockers/warnings.

- [ ] **Step 1: Write depreciation tests**

Test straight-line schedule with residual value, partial first period and exact final rounding in minor units.

- [ ] **Step 2: Write weighted-average tests**

```ts
expect(weightedAverage([
  {qty:10n,totalCostMinor:10000n},
  {qty:10n,totalCostMinor:14000n},
])).toEqual({qty:20n,totalCostMinor:24000n,unitCostRational:{numerator:24000n,denominator:20n}});
```

- [ ] **Step 3: Implement asset/inventory posting proposals**

Calculators return proposed journal drafts; a separate authorized service posts them so calculators remain deterministic and side-effect free.

- [ ] **Step 4: Implement close readiness**

Block close on unposted required batches, unreconciled material bank items, invalid statement mapping or unfinished required approvals; return machine-readable blocker codes and Arabic/English messages.

- [ ] **Step 5: Run tests and commit**

Run `pnpm --filter @new/accounting test`; then commit with `feat: add assets inventory and close controls`.

### Task 4: Implement staged CSV/XLSX/OFX import pipeline

**Files:**
- Create: `packages/import/src/types.ts`
- Create: `packages/import/src/preflight.ts`
- Create: `packages/import/src/normalize.ts`
- Create: `packages/import/src/staging-service.ts`
- Test: `packages/import/src/preflight.test.ts`
- Test: `packages/import/src/normalize.test.ts`
- Create: `apps/worker/src/jobs/import-file.ts`
- Create: `apps/api/src/routes/imports.ts`

**Interfaces:**
- Consumes: object storage, queue, tenant context.
- Produces: `preflightUpload()`, `stageImport()`, `validateStagedImport()`, `commitImport()`.

- [ ] **Step 1: Write malicious/invalid input tests**

Reject oversize file, unsupported extension/MIME mismatch, workbook formula cells where values are required, duplicate headers and rows lacking required identifiers.

- [ ] **Step 2: Implement canonical staged row schema**

```ts
interface StagedTransactionRow {
  sourceRow: number;
  date: string;
  externalId?: string;
  description: string;
  debitMinor?: bigint;
  creditMinor?: bigint;
  amountMinor?: bigint;
  currency: string;
  accountCode?: string;
  raw: Record<string,string>;
}
```

- [ ] **Step 3: Implement validation and dry-run summary**

Return counts of valid/error/warning rows, duplicates, unknown accounts and prospective journal totals; canonical tables remain untouched.

- [ ] **Step 4: Implement commit with idempotency**

`commitImport(importId,idempotencyKey)` records source hash and refuses duplicate commit; create journals only after validation succeeds.

- [ ] **Step 5: Run tests and commit**

Run `pnpm --filter @new/import test`; commit `feat: add safe staged financial imports`.

### Task 5: Implement bank reconciliation engine

**Files:**
- Create: `packages/reconciliation/src/types.ts`
- Create: `packages/reconciliation/src/normalize.ts`
- Create: `packages/reconciliation/src/match.ts`
- Create: `packages/reconciliation/src/reconciliation-service.ts`
- Test: `packages/reconciliation/src/match.test.ts`
- Test: `packages/reconciliation/src/reconciliation-service.test.ts`
- Create: `apps/api/src/routes/reconciliation.ts`

**Interfaces:**
- Consumes: bank staged records and ledger entries.
- Produces: normalized bank transactions, match candidates with confidence, approved matches, exceptions and governed exclusions.

- [ ] **Step 1: Write deterministic matching tests**

Exact amount/date/reference match must score above fuzzy memo match; different currency is never auto-matched; already matched ledger entries cannot be reused.

- [ ] **Step 2: Implement score breakdown**

```ts
interface MatchScore {total:number; amount:number; date:number; reference:number; description:number; reasons:string[]}
```

Keep each component explainable and clamp total to `[0,1]`.

- [ ] **Step 3: Implement approval boundary**

Low/medium confidence suggestions remain proposals; user confirmation creates a reconciliation link. Exclusions require reason, actor and timestamp.

- [ ] **Step 4: Add conservation tests**

Assert opening balance + bank movements - unresolved/excluded handling equals reported reconciliation position according to configured rule set.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/reconciliation test`; commit `feat: add governed bank reconciliation`.

### Task 6: Implement deterministic analytics and risk indicators

**Files:**
- Create: `packages/analytics/src/ratios.ts`
- Create: `packages/analytics/src/aging.ts`
- Create: `packages/analytics/src/variance.ts`
- Create: `packages/analytics/src/benford.ts`
- Create: `packages/analytics/src/distress.ts`
- Create: `packages/analytics/src/scenario.ts`
- Test: `packages/analytics/src/*.test.ts`
- Create: `apps/api/src/routes/analytics.ts`

**Interfaces:**
- Consumes: trial balance, invoices/bills, ledger extracts.
- Produces: typed KPI/risk outputs with input references and method labels.

- [ ] **Step 1: Write ratio and aging tests**

Cover zero denominator behavior, sign normalization, current/quick ratio, margin, leverage, DSO/DPO and configurable aging buckets.

- [ ] **Step 2: Implement Benford with applicability metadata**

Return `{applicable:boolean, reason?:string, n:number, observed, expected, deviation}` and refuse to label small/non-natural datasets as suspicious conclusions.

- [ ] **Step 3: Implement distress indicators as signals**

Return score, component values, formula version and a label stating the result is an analytical signal rather than a professional conclusion.

- [ ] **Step 4: Add scenario/version tracking contract**

Forecast scenarios are immutable versions with assumptions, base period and author; computed outputs link to input snapshot hash.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/analytics test`; commit `feat: add explainable financial analytics`.

### Task 7: Implement financial statement mappings and validation

**Files:**
- Create: `packages/statements/src/mapping.ts`
- Create: `packages/statements/src/build-statements.ts`
- Create: `packages/statements/src/validate-statements.ts`
- Test: `packages/statements/src/build-statements.test.ts`
- Test: `packages/statements/src/validate-statements.test.ts`
- Create: `apps/api/src/routes/statements.ts`

**Interfaces:**
- Consumes: trial balance and configurable statement mapping.
- Produces: statement of financial position, profit/comprehensive income, cash flow mapping output, changes in equity and validation diagnostics.

- [ ] **Step 1: Write structural validation tests**

Test assets = liabilities + equity, mapped/unmapped account detection, sign convention, comparative period consistency and arithmetic subtotals.

- [ ] **Step 2: Implement mapping contract**

```ts
interface StatementMappingRule {accountPattern:string; statement:string; section:string; lineKey:string; sign:1|-1; cashFlowTag?:string}
```

- [ ] **Step 3: Build statements from canonical balances**

No free-form AI amount generation; every displayed amount carries contributing account IDs and period provenance.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/statements test`; commit `feat: add traceable financial statements`.

### Task 8: Implement asynchronous multi-format reporting and finance UI

**Files:**
- Create: `packages/reporting/src/report-types.ts`
- Create: `packages/reporting/src/generate-csv.ts`
- Create: `packages/reporting/src/generate-xlsx.ts`
- Create: `packages/reporting/src/generate-pdf.ts`
- Create: `packages/reporting/src/manifest.ts`
- Test: `packages/reporting/src/reporting.test.ts`
- Create: `apps/worker/src/jobs/generate-report.ts`
- Create: `apps/api/src/routes/reports.ts`
- Create: `apps/web/src/features/accounting/*`
- Create: `apps/web/src/features/reconciliation/*`
- Create: `apps/web/src/features/analytics/*`
- Create: `apps/web/src/features/statements/*`
- Create: `apps/web/src/features/reports/*`
- Test: `apps/web/e2e/finance-flow.spec.ts`

**Interfaces:**
- Consumes: finance package read models and object storage.
- Produces: immutable report artifact record `{id,format,storageKey,sha256,generatedAt,inputSnapshotHash}` plus usable finance workspaces.

- [ ] **Step 1: Write golden export tests**

Generate a small Arabic/English trial-balance fixture; assert CSV encoding, XLSX cells, PDF metadata and manifest SHA linkage are deterministic.

- [ ] **Step 2: Implement queued generation**

API enqueues by report type/input snapshot; worker generates artifact, hashes bytes, stores object and creates immutable metadata record.

- [ ] **Step 3: Build finance workspaces**

Implement account browser, journal form with balance preview, trial balance, reconciliation candidate review, analytics dashboard, statement validation panel and report center using typed API clients.

- [ ] **Step 4: Write E2E finance flow**

Create/import fixture, post authorized balanced journal, view trial balance, reconcile bank item, inspect statement validation and generate XLSX report.

- [ ] **Step 5: Run completion gate**

Run: `pnpm --filter @new/accounting test && pnpm --filter @new/import test && pnpm --filter @new/reconciliation test && pnpm --filter @new/analytics test && pnpm --filter @new/statements test && pnpm --filter @new/reporting test && pnpm --filter @new/web test:e2e`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/reporting apps/worker apps/api/src/routes/reports.ts apps/web/src/features apps/web/e2e/finance-flow.spec.ts
git commit -m "feat: deliver finance reporting workspaces"
```
