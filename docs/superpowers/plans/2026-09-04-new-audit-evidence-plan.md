# NEW Audit and Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete audit-engagement lifecycle and evidence graph with materiality, sampling, PBC, misstatements, review, completion and human sign-off controls.

**Architecture:** Audit records are tenant/entity/engagement scoped and separated from accounting authority. Evidence is modeled as content-hashed nodes and typed relationships; audit conclusions consume deterministic finance data and evidence links, while AI outputs remain proposals subject to human review.

**Tech Stack:** TypeScript, PostgreSQL/Drizzle, Zod, Vitest, fast-check, object storage, SHA-256 hashing, React, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Audit opinion, evidence sign-off, materiality override and completion approval require human authorization.
- Every finding/procedure/conclusion must be linkable to assertions, risks and evidence where applicable.
- Evidence files are content-hashed; sealed bundles are immutable artifacts.
- AI may draft findings/opinions but may not mark them approved.
- Engagement data remains isolated by tenant and explicit engagement membership/permissions.
- No legacy application directories are copied into NEW.

---

## File structure map

```text
packages/audit/src/{engagements,planning,materiality,sampling,procedures,pbc,misstatements,review,completion,going-concern}/*
packages/evidence/src/{nodes,edges,hashing,bundles,verification,redaction}/*
packages/data/src/schema/{audit,evidence}.ts
apps/api/src/routes/{audit,evidence}.ts
apps/worker/src/jobs/evidence-bundle.ts
apps/web/src/features/{audit,evidence}/*
apps/web/e2e/audit-flow.spec.ts
```

### Task 1: Implement engagement model, team and lifecycle

**Files:**
- Create: `packages/audit/src/engagements/types.ts`
- Create: `packages/audit/src/engagements/engagement-service.ts`
- Create: `packages/data/src/schema/audit.ts`
- Create: `packages/data/migrations/0002_audit.sql`
- Test: `packages/audit/src/engagements/engagement-service.test.ts`
- Create: `apps/api/src/routes/audit.ts`

**Interfaces:**
- Consumes: `RequestContext`, entity/period identifiers.
- Produces: `AuditEngagement`, `createEngagement()`, `transitionEngagement()`, `assignEngagementMember()`.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it('prevents completion before required review gates are satisfied', async () => {
  await expect(transitionEngagement(ctx, engagementId, 'completed')).rejects.toThrow(/completion gate/i);
});
```

- [ ] **Step 2: Implement lifecycle states**

Use `draft -> planning -> fieldwork -> review -> completion -> archived`. Reject backward/skip transitions except explicit reopen action with reason and `audit.approve` permission.

- [ ] **Step 3: Implement team roles**

Roles: `preparer`, `senior`, `manager`, `partner`, `observer`; role does not itself grant tenant permission, so service checks both membership and permission.

- [ ] **Step 4: Add API routes and tests**

Create/list/read engagements, assign team, transition lifecycle; reject cross-tenant IDs and missing permissions.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/audit test && pnpm --filter @new/api test`; commit `feat: add governed audit engagement lifecycle`.

### Task 2: Implement risk assessment, assertions and audit programs

**Files:**
- Create: `packages/audit/src/planning/assertions.ts`
- Create: `packages/audit/src/planning/risk-service.ts`
- Create: `packages/audit/src/procedures/procedure-service.ts`
- Test: `packages/audit/src/planning/risk-service.test.ts`
- Test: `packages/audit/src/procedures/procedure-service.test.ts`

**Interfaces:**
- Consumes: engagement ID, statement/account references.
- Produces: `Risk`, `Assertion`, `AuditProcedure`, risk-to-assertion and risk-to-procedure links.

- [ ] **Step 1: Write failing assertion coverage tests**

Create a significant account risk and assert completion diagnostics fail when no procedure covers its mapped assertion.

- [ ] **Step 2: Implement canonical assertions**

Use stable keys such as `existence`, `completeness`, `accuracy`, `valuation`, `rights_obligations`, `cutoff`, `classification`, `presentation` with Arabic/English labels.

- [ ] **Step 3: Implement risk scoring**

Store inherent-risk inputs, control reliance decision, rationale, severity and source references. Keep calculation transparent and versioned.

- [ ] **Step 4: Implement procedure ownership/status**

Statuses `planned`, `in_progress`, `performed`, `reviewed`, `cleared`; performed procedure requires performer, timestamp and result; reviewed requires a different authorized reviewer unless policy explicitly allows self-review.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add audit risks assertions and programs`.

### Task 3: Implement materiality and controlled overrides

**Files:**
- Create: `packages/audit/src/materiality/calculate-materiality.ts`
- Create: `packages/audit/src/materiality/materiality-service.ts`
- Test: `packages/audit/src/materiality/calculate-materiality.test.ts`
- Test: `packages/audit/src/materiality/materiality-service.test.ts`

**Interfaces:**
- Consumes: benchmark amount in exact minor units and policy basis points.
- Produces: `MaterialityCalculation`, performance materiality, trivial threshold, immutable override record.

- [ ] **Step 1: Write exact calculation tests**

```ts
expect(calculateMateriality({benchmarkMinor:10_000_000n, basisPoints:500n})).toBe(500_000n);
```

Use integer arithmetic and deterministic rounding rules.

- [ ] **Step 2: Implement benchmark contract**

```ts
interface MaterialityInput {benchmarkKey:string; benchmarkMinor:bigint; basisPoints:bigint; rationale:string}
```

Performance materiality and trivial threshold each have explicit basis-point policies and returned provenance.

- [ ] **Step 3: Implement override gate**

Override requires `audit.approve`, previous/new amounts, reason, actor and timestamp. Never mutate the original calculation row; create a new effective version.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add exact materiality controls`.

### Task 4: Implement sampling and journal-entry testing selections

**Files:**
- Create: `packages/audit/src/sampling/random-sample.ts`
- Create: `packages/audit/src/sampling/monetary-unit-sample.ts`
- Create: `packages/audit/src/sampling/sample-service.ts`
- Create: `packages/audit/src/procedures/journal-entry-testing.ts`
- Test: `packages/audit/src/sampling/*.test.ts`
- Test: `packages/audit/src/procedures/journal-entry-testing.test.ts`

**Interfaces:**
- Consumes: immutable population snapshot hash and row IDs.
- Produces: reproducible sample with seed, method, coverage and selected IDs; deterministic JE-selection reasons.

- [ ] **Step 1: Write reproducibility tests**

Same population snapshot + seed + method yields identical selections; changed population hash invalidates reuse.

- [ ] **Step 2: Implement random and monetary-unit sampling**

Return method parameters, selection seed, population size/value, sample size/value and selected item IDs. Reject negative amounts and empty population where method requires value.

- [ ] **Step 3: Implement JE rule selections**

Rules include unusual hours/dates where timestamp exists, manual postings, round values, rare accounts/users, near-period-end, reversals, large/material entries and configured keyword/reference patterns. Each selected journal stores reasons rather than an opaque score only.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add reproducible audit sampling and JE selections`.

### Task 5: Implement evidence graph, hashing and typed links

**Files:**
- Create: `packages/evidence/src/types.ts`
- Create: `packages/evidence/src/hash.ts`
- Create: `packages/evidence/src/evidence-service.ts`
- Create: `packages/evidence/src/graph-service.ts`
- Create: `packages/data/src/schema/evidence.ts`
- Create: `packages/data/migrations/0003_evidence.sql`
- Test: `packages/evidence/src/hash.test.ts`
- Test: `packages/evidence/src/graph-service.test.ts`

**Interfaces:**
- Consumes: object storage key/bytes metadata, engagement context, provenance.
- Produces: `EvidenceNode`, typed `EvidenceEdge`, `sha256Hex()`, `linkEvidence()`.

- [ ] **Step 1: Write hashing test**

Assert known UTF-8 fixture produces stable SHA-256 and repeated upload of same bytes is recognized as same content hash without silently merging distinct metadata records.

- [ ] **Step 2: Implement node/edge types**

Node kinds: `source_document`, `transaction`, `account`, `test`, `finding`, `risk`, `assertion`, `ai_analysis`, `human_decision`, `report_section`. Edge kinds: `supports`, `contradicts`, `derived_from`, `sampled_from`, `reviewed_by`, `resolves`, `cites`.

- [ ] **Step 3: Validate graph constraints**

Reject self-edge when meaningless, cross-tenant edges, unknown node kinds, and links to deleted/non-visible evidence. Preserve append-only relationship history when a link is superseded.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/evidence test`; commit `feat: add content-hashed audit evidence graph`.

### Task 6: Implement PBC, findings and misstatement register

**Files:**
- Create: `packages/audit/src/pbc/pbc-service.ts`
- Create: `packages/audit/src/review/finding-service.ts`
- Create: `packages/audit/src/misstatements/misstatement-service.ts`
- Test: `packages/audit/src/pbc/pbc-service.test.ts`
- Test: `packages/audit/src/misstatements/misstatement-service.test.ts`

**Interfaces:**
- Consumes: engagements, evidence node IDs, exact Money/materiality.
- Produces: PBC requests/responses, findings, misstatement aggregation and disposition.

- [ ] **Step 1: Write PBC state tests**

States: `draft`, `requested`, `received`, `accepted`, `rejected`, `closed`; accepted/closed requests require linked evidence or documented exception.

- [ ] **Step 2: Implement findings**

Finding has severity, assertion/risk links, evidence links, owner, status, due date and resolution. Closure requires resolution text and reviewer action.

- [ ] **Step 3: Implement misstatement aggregation**

Track factual/judgmental/projected classification, account/statement line, amount, tax effect metadata, corrected/unadjusted status and materiality comparison. Aggregate exact amounts by currency and reject automatic cross-currency summation without FX policy.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add PBC findings and misstatement register`.

### Task 7: Implement going concern, review notes and completion gates

**Files:**
- Create: `packages/audit/src/going-concern/assessment.ts`
- Create: `packages/audit/src/review/review-note-service.ts`
- Create: `packages/audit/src/completion/completion-checklist.ts`
- Test: `packages/audit/src/completion/completion-checklist.test.ts`

**Interfaces:**
- Consumes: open findings, procedures, PBC, misstatements, evidence sufficiency, statement diagnostics.
- Produces: completion blockers/warnings, going-concern assessment record, review-note clearance state.

- [ ] **Step 1: Write completion blocker tests**

Completion fails for unreviewed significant procedures, unresolved high-severity findings, unsigned evidence requiring sign-off, unaddressed material misstatements, overdue required PBC or unapproved materiality override.

- [ ] **Step 2: Implement going-concern assessment**

Capture indicators, forecast source refs, management plans, sensitivity notes, conclusion proposal and reviewer decision. No automatic professional conclusion from an analytical distress score.

- [ ] **Step 3: Implement review-note independence**

Review note creator may not clear their own note unless policy explicitly allows it; clearance records actor/time/rationale.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add audit review and completion controls`.

### Task 8: Implement draft opinion assistant boundary and sign-off trail

**Files:**
- Create: `packages/audit/src/completion/opinion.ts`
- Create: `packages/audit/src/completion/signoff-service.ts`
- Test: `packages/audit/src/completion/opinion.test.ts`
- Test: `packages/audit/src/completion/signoff-service.test.ts`

**Interfaces:**
- Consumes: completion diagnostics and optional AI proposal ID.
- Produces: draft opinion record, human `SignOff` records, final approved conclusion metadata.

- [ ] **Step 1: Write authority tests**

An AI actor can create `opinion_proposal` but cannot create `final_opinion`; unauthorized human also fails; authorized final approver succeeds only if completion gates pass.

- [ ] **Step 2: Implement opinion proposal schema**

Store proposed opinion type, basis text, uncertainty, evidence refs, AI execution ID if applicable, and `status='proposal'`.

- [ ] **Step 3: Implement immutable sign-offs**

Each sign-off includes role, user, timestamp, engagement state digest and correlation ID. Changing material engagement data after sign-off invalidates the affected completion digest and requires re-sign-off.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/audit test`; commit `feat: add human-controlled audit opinion signoff`.

### Task 9: Implement evidence bundles, verification and audit UI

**Files:**
- Create: `packages/evidence/src/bundles/manifest.ts`
- Create: `packages/evidence/src/bundles/seal.ts`
- Create: `packages/evidence/src/bundles/verify.ts`
- Test: `packages/evidence/src/bundles/verify.test.ts`
- Create: `apps/worker/src/jobs/evidence-bundle.ts`
- Create: `apps/api/src/routes/evidence.ts`
- Create: `apps/web/src/features/audit/*`
- Create: `apps/web/src/features/evidence/*`
- Create: `apps/web/e2e/audit-flow.spec.ts`

**Interfaces:**
- Consumes: evidence graph and object storage.
- Produces: immutable manifest, bundle seal, verification result, audit/evidence workspaces.

- [ ] **Step 1: Write tamper-detection test**

Build fixture manifest, seal it, verify success, change one file hash and assert verification fails with exact mismatched path/reference.

- [ ] **Step 2: Implement manifest/seal**

Manifest contains bundle version, tenant/engagement ID, evidence node IDs, file hashes, graph edge digest, generated timestamp and generator version. Seal hash is over canonical JSON bytes.

- [ ] **Step 3: Build audit UI**

Implement engagement overview, risk/assertion matrix, procedures, materiality, sampling, PBC, evidence graph/list, findings, misstatements, review notes, completion checklist and sign-off screens.

- [ ] **Step 4: Write full E2E audit flow**

Create engagement, plan risk, calculate materiality, select sample, link evidence, close finding, aggregate misstatement, satisfy completion gates, create draft opinion and final human sign-off.

- [ ] **Step 5: Run completion gate**

Run `pnpm --filter @new/audit test && pnpm --filter @new/evidence test && pnpm --filter @new/web test:e2e`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/audit packages/evidence apps/api/src/routes/audit.ts apps/api/src/routes/evidence.ts apps/worker/src/jobs/evidence-bundle.ts apps/web/src/features/audit apps/web/src/features/evidence apps/web/e2e/audit-flow.spec.ts
git commit -m "feat: deliver audit and evidence platform"
```
