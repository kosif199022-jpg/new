# NEW Advanced Finance and Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete advanced finance/audit capabilities not covered deeply enough by the core plans: VAT/tax, multi-currency FX, dimensions/projects, cash controls, advanced analytics/visualization, continuous audit, subsequent events and evidence media/redaction.

**Architecture:** Extend existing deterministic finance/audit/evidence contracts rather than introducing parallel engines. Calculations remain deterministic, analytics remain explainable, continuous audit runs through workflow/worker boundaries, and media remains evidence with tenant policy, hashing and provenance.

**Tech Stack:** TypeScript, PostgreSQL/Drizzle, Vitest, fast-check, BullMQ, React, Web APIs for capture, object storage.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Tax/FX outputs are versioned calculations/proposals until authorized posting occurs.
- No automatic cross-currency aggregation without explicit rate source/policy and effective date.
- Continuous audit cannot silently alter canonical accounting data.
- Evidence media obeys capture consent/policy, hashing, retention and redaction rules.
- 3D/advanced visuals are presentation only over canonical analytics outputs.

---

### Task 1: Implement dimensions, projects, cost centers, cash and petty cash controls

**Files:**
- Create: `packages/accounting/src/dimensions/dimension-service.ts`
- Create: `packages/accounting/src/cash/cash-account-service.ts`
- Test: `packages/accounting/src/dimensions/dimension-service.test.ts`
- Test: `packages/accounting/src/cash/cash-account-service.test.ts`
- Modify: `packages/data/src/schema/accounting.ts`

**Interfaces:**
- Consumes: journal lines and account records.
- Produces: dimension definitions/values, journal dimension assignments, explicit cash/bank/petty-cash account classes and replenishment proposal.

- [ ] **Step 1: Write dimension tests**

Reject a journal line using a dimension value from another tenant or inactive project; allow configured required dimensions by account class.

- [ ] **Step 2: Implement dimension model**

Use stable dimension keys (`cost_center`, `project` plus tenant-defined keys), values, active periods and optional required-on-account policy.

- [ ] **Step 3: Implement petty-cash workflow**

Cash account classification distinguishes `bank`, `cash_on_hand`, `petty_cash`; replenishment calculator returns a balanced journal draft and requires normal posting authorization.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/accounting test`; commit `feat: add dimensions projects and cash controls`.

### Task 2: Implement VAT/tax calculation hooks and analytics

**Files:**
- Create: `packages/accounting/src/tax/types.ts`
- Create: `packages/accounting/src/tax/tax-engine.ts`
- Create: `packages/analytics/src/tax-analytics.ts`
- Test: `packages/accounting/src/tax/tax-engine.test.ts`
- Test: `packages/analytics/src/tax-analytics.test.ts`

**Interfaces:**
- Consumes: invoice/bill lines, jurisdiction/configured tax codes.
- Produces: deterministic tax calculation lines, tax posting proposal and analytical exceptions.

- [ ] **Step 1: Write exact tax tests**

Test inclusive/exclusive rate calculations in integer minor units, exemption code, zero-rate code and deterministic remainder allocation across lines.

- [ ] **Step 2: Implement versioned tax policy**

```ts
interface TaxCode {key:string; jurisdiction:string; rateBasisPoints:bigint; mode:'exclusive'|'inclusive'|'zero'|'exempt'; effectiveFrom:string; effectiveTo?:string}
```

Calculation output stores policy key/version and source line refs.

- [ ] **Step 3: Implement tax analytics**

Detect missing tax code, inconsistent effective date, unusual effective rate, sales/purchase tax reconciliation difference and tax-control-account mismatch as explainable diagnostics.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/accounting test && pnpm --filter @new/analytics test`; commit `feat: add deterministic tax controls and analytics`.

### Task 3: Implement multi-currency and controlled FX valuation

**Files:**
- Create: `packages/accounting/src/fx/types.ts`
- Create: `packages/accounting/src/fx/convert.ts`
- Create: `packages/accounting/src/fx/revaluation.ts`
- Test: `packages/accounting/src/fx/convert.test.ts`
- Test: `packages/accounting/src/fx/revaluation.test.ts`

**Interfaces:**
- Consumes: transaction currency amounts and explicit FX rate source/version.
- Produces: base-currency valuation and revaluation journal proposal.

- [ ] **Step 1: Write rational-rate tests**

Use rational/decimal representation with explicit rounding rule; assert repeatable conversion and no JavaScript float arithmetic in authoritative result.

- [ ] **Step 2: Implement rate contract**

```ts
interface FxRate {base:string; quote:string; numerator:bigint; denominator:bigint; effectiveAt:string; source:string; version:string}
```

- [ ] **Step 3: Implement period-end revaluation proposal**

Calculate unrealized difference by open monetary item/account, group into balanced proposal, preserve original transaction currency and rate provenance.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/accounting test`; commit `feat: add controlled multi-currency valuation`.

### Task 4: Complete advanced analytics and presentation layers

**Files:**
- Create: `packages/analytics/src/anomalies.ts`
- Create: `packages/analytics/src/risk-score.ts`
- Create: `packages/analytics/src/sales.ts`
- Create: `packages/analytics/src/inventory-margin.ts`
- Create: `packages/analytics/src/reconciliation-quality.ts`
- Test: `packages/analytics/src/anomalies.test.ts`
- Test: `packages/analytics/src/risk-score.test.ts`
- Create: `apps/web/src/features/analytics/risk-heatmap.tsx`
- Create: `apps/web/src/features/analytics/advanced-visualization.tsx`
- Test: `apps/web/src/features/analytics/advanced-visualization.test.tsx`

**Interfaces:**
- Consumes: canonical analytics/read models.
- Produces: anomaly diagnostics, risk heatmap matrix, sales/inventory/reconciliation KPIs and optional 3D visualization data model.

- [ ] **Step 1: Write explainability tests**

Every anomaly/risk output must include rule/component IDs and source refs; opaque score without components fails schema validation.

- [ ] **Step 2: Implement domain analytics**

Add rule-based anomalies, weighted/versioned risk scoring, sales growth/margin/customer concentration, inventory turns/gross margin, reconciliation match/exceptions/age quality metrics.

- [ ] **Step 3: Implement heatmap and optional 3D projection**

UI consumes canonical `RiskPoint {id,label,likelihood,impact,category,value,sourceRefs}`. 3D projection may map value/category to a third visual dimension but cannot recompute risk or alter source data.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/analytics test && pnpm --filter @new/web test`; commit `feat: complete advanced financial analytics`.

### Task 5: Implement subsequent-events register

**Files:**
- Create: `packages/audit/src/completion/subsequent-events.ts`
- Test: `packages/audit/src/completion/subsequent-events.test.ts`

**Interfaces:**
- Consumes: engagement, reporting date, event evidence refs.
- Produces: subsequent-event records, adjusting/non-adjusting classification proposal and resolution status.

- [ ] **Step 1: Write lifecycle tests**

A required subsequent-event procedure cannot be marked complete while an identified event lacks evaluation/resolution. AI classification stays proposal until human reviewer accepts/rejects.

- [ ] **Step 2: Implement event record**

Capture discovered date, event date, source refs, description, potential financial effect, proposed classification, management response, audit response and reviewer decision.

- [ ] **Step 3: Integrate completion gate**

Completion diagnostics include unresolved events and required subsequent-event procedure status.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add subsequent-events audit tracking`.

### Task 6: Implement continuous-audit runs over new data

**Files:**
- Create: `packages/audit/src/continuous/types.ts`
- Create: `packages/audit/src/continuous/continuous-audit-service.ts`
- Test: `packages/audit/src/continuous/continuous-audit-service.test.ts`
- Create: `apps/worker/src/jobs/continuous-audit.ts`

**Interfaces:**
- Consumes: new import/connector snapshot IDs, configured audit rules and engagement scope.
- Produces: immutable continuous-audit run with selections/findings proposals and source snapshot digest.

- [ ] **Step 1: Write idempotency tests**

Same engagement + source snapshot + rule-set version yields one logical run; replay returns existing run. Changed source snapshot or rule version creates new run.

- [ ] **Step 2: Implement run pipeline**

Run deterministic JE/anomaly/risk rules first, create candidate findings/procedure results as proposals, link source evidence and route material findings to human review workflow.

- [ ] **Step 3: Prevent silent authority**

Continuous run cannot post adjustments, close findings, approve evidence or alter final opinion.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add continuous audit runs`.

### Task 7: Implement evidence media capture, redaction and export policy

**Files:**
- Create: `packages/evidence/src/media/types.ts`
- Create: `packages/evidence/src/media/media-service.ts`
- Create: `packages/evidence/src/redaction.ts`
- Create: `packages/evidence/src/export-policy.ts`
- Test: `packages/evidence/src/media/media-service.test.ts`
- Test: `packages/evidence/src/redaction.test.ts`
- Create: `apps/web/src/features/evidence/media-capture.tsx`

**Interfaces:**
- Consumes: image/audio/screen-capture bytes or object refs and tenant media policy.
- Produces: hashed media evidence node, redacted derivative artifact and export decision.

- [ ] **Step 1: Write policy tests**

If screen/audio capture is disabled by tenant policy, service rejects capture metadata before storage; redacted derivative gets separate hash and `derived_from` edge; original remains protected by stricter permission.

- [ ] **Step 2: Implement media metadata**

Store media kind, MIME, duration/dimensions where relevant, capture source, actor, capturedAt, storage key, SHA-256, consent/policy reference and engagement/evidence linkage.

- [ ] **Step 3: Implement export policy**

Return `allow|deny|redacted_only` based on evidence classification, requester permission, legal hold/export policy and redacted derivative availability.

- [ ] **Step 4: Build capture UI**

Use browser capture APIs only after explicit user action; show current recording/capture state and policy/retention indicator; upload through normal evidence preflight.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/evidence test && pnpm --filter @new/web test`; commit `feat: add governed evidence media and redaction`.

### Task 8: Complete finance/reporting capability center

**Files:**
- Create: `packages/accounting/src/capabilities.ts`
- Create: `packages/reporting/src/generate-json.ts`
- Create: `packages/reporting/src/templates/branding.ts`
- Test: `packages/accounting/src/capabilities.test.ts`
- Test: `packages/reporting/src/generate-json.test.ts`

**Interfaces:**
- Consumes: deterministic calculators/services.
- Produces: stable capability registry for UI/API/AI read/proposal tools and JSON/branded report outputs.

- [ ] **Step 1: Write capability registry test**

Assert registry includes separate read/calculation entries for depreciation, weighted average, tax, FX, close readiness, ratios, reconciliation diagnostics and statement validation, with authority metadata.

- [ ] **Step 2: Implement JSON and branding support**

JSON export uses versioned schema and source/provenance refs. Branding config supports Arabic/English organization name, logo reference, report footer and locale-safe typography; no raw untrusted HTML templates.

- [ ] **Step 3: Verify management report catalog**

Register trial balance, ledger, aging, sales, inventory/margin, reconciliation, risk register, financial statements and audit-execution report descriptors with PDF/XLSX/CSV/JSON support as applicable.

- [ ] **Step 4: Run completion gate**

Run `pnpm --filter @new/accounting test && pnpm --filter @new/analytics test && pnpm --filter @new/audit test && pnpm --filter @new/evidence test && pnpm --filter @new/reporting test && pnpm --filter @new/web test`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/accounting packages/analytics packages/audit packages/evidence packages/reporting apps/worker/src/jobs/continuous-audit.ts apps/web/src/features/analytics apps/web/src/features/evidence
git commit -m "feat: complete advanced finance audit and evidence capabilities"
```
