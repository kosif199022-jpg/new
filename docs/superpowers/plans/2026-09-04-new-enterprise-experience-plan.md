# NEW Enterprise Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete enterprise identity, PWA/user experience, knowledge-library governance and observability/cost capabilities required by the approved platform specification.

**Architecture:** Extend the foundation rather than creating parallel auth/UI/knowledge stacks. Identity uses OIDC-ready adapters and provider-enforced MFA state, web remains an Arabic-first responsive PWA, knowledge libraries preserve tenant/shared boundaries, and operational metrics/costs are first-class observable data with tenant-safe aggregation.

**Tech Stack:** TypeScript, Fastify, OIDC/OAuth 2.0 adapter interfaces, React 19, Vite 7 PWA support, PostgreSQL/Drizzle, OpenTelemetry, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- SSO/MFA integration must not weaken local tenant authorization or bypass RequestContext permission checks.
- Shared/public knowledge is opt-in and never exposes tenant-private documents.
- PWA/offline behavior must not cache secrets, protected evidence bytes or privileged API responses indiscriminately.
- Operational metrics/logs must avoid raw secrets and sensitive document contents.
- Usage/cost reporting is attributable by tenant/provider/model/service without exposing credentials.

---

### Task 1: Implement enterprise scope hierarchy and OIDC-ready SSO

**Files:**
- Create: `packages/identity/src/scopes.ts`
- Create: `packages/identity/src/oidc/provider.ts`
- Create: `packages/identity/src/oidc/session-mapper.ts`
- Test: `packages/identity/src/scopes.test.ts`
- Test: `packages/identity/src/oidc/session-mapper.test.ts`
- Modify: `packages/data/src/schema/core.ts`

**Interfaces:**
- Consumes: external OIDC claims and existing tenant memberships.
- Produces: organization/entity/engagement scope resolution and authenticated local session mapping.

- [ ] **Step 1: Write scope-isolation tests**

A user with organization membership but no entity/engagement permission cannot access restricted engagement data; cross-tenant organization/entity IDs are rejected.

- [ ] **Step 2: Implement scope hierarchy**

```ts
interface AccessScope {tenantId:string; organizationId?:string; entityId?:string; engagementId?:string}
```

Authorization checks requested scope against both local membership/permissions and resource ancestry.

- [ ] **Step 3: Implement OIDC provider adapter**

Define issuer, client ID, redirect URI, allowed domain/claim mapping and token-validation hooks. External subject maps to local user record; tenant membership is never inferred solely from email domain unless explicit tenant policy allows a controlled provisioning rule.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/identity test`; commit `feat: add enterprise scope and OIDC identity adapters`.

### Task 2: Implement MFA assurance enforcement

**Files:**
- Create: `packages/identity/src/assurance.ts`
- Test: `packages/identity/src/assurance.test.ts`
- Modify: `apps/api/src/plugins/context.ts`

**Interfaces:**
- Consumes: identity-provider authentication context/AMR/ACR claims.
- Produces: session assurance level and `requireAssurance(ctx, level)` gate.

- [ ] **Step 1: Write protected-action tests**

Posting/reversal, final audit approval, evidence sign-off, connector-secret changes and admin policy changes fail when configured policy requires MFA and the session assurance level is below threshold.

- [ ] **Step 2: Implement assurance levels**

Use stable levels such as `single_factor`, `mfa`, `phishing_resistant`; map provider AMR/ACR claims through configurable adapter and never trust a client-supplied assurance flag.

- [ ] **Step 3: Integrate RequestContext**

Add assurance metadata to authenticated server context only and keep authorization checks explicit at protected services/routes.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/identity test && pnpm --filter @new/api test`; commit `feat: enforce MFA assurance on protected actions`.

### Task 3: Make the web application a safe responsive PWA

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/src/pwa/cache-policy.ts`
- Test: `apps/web/src/pwa/cache-policy.test.ts`
- Create: `apps/web/e2e/pwa.spec.ts`

**Interfaces:**
- Consumes: existing web shell and static asset build.
- Produces: installable PWA manifest/service worker with explicit safe cache policy.

- [ ] **Step 1: Write cache policy tests**

Static hashed assets may cache; authenticated API responses, evidence downloads, voice session credentials, connector callbacks and admin routes are `network-only/no-store`.

- [ ] **Step 2: Implement PWA manifest**

Arabic-first name/short-name, standalone display, RTL-compatible theme metadata and application icons sourced from repository assets created for NEW.

- [ ] **Step 3: Implement responsive offline shell**

Offline shell may show navigation/chrome and a clear disconnected state, but cannot present stale financial values as current unless a page explicitly labels a cached timestamp and policy permits it.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/web test && pnpm --filter @new/web test:e2e`; commit `feat: add safe responsive PWA behavior`.

### Task 4: Implement command/search palette and unified operational dashboard

**Files:**
- Create: `apps/web/src/features/command-palette/command-registry.ts`
- Create: `apps/web/src/features/command-palette/command-palette.tsx`
- Create: `apps/web/src/features/dashboard/dashboard.tsx`
- Create: `apps/web/src/features/dashboard/dashboard-model.ts`
- Test: `apps/web/src/features/command-palette/command-palette.test.tsx`
- Test: `apps/web/src/features/dashboard/dashboard.test.tsx`

**Interfaces:**
- Consumes: permitted routes/actions and health/read-model APIs.
- Produces: keyboard-accessible unified command palette and dashboard cards for finance, audit, workflow, AI/voice and integration health.

- [ ] **Step 1: Write permission-filter tests**

Commands/actions not permitted by current user are absent; read-only user never sees posting/admin mutation commands.

- [ ] **Step 2: Implement palette**

Support Arabic/English labels/aliases, keyboard navigation, route search and explicit action confirmation for any non-read navigation command.

- [ ] **Step 3: Implement dashboard model**

Cards include financial health KPIs, audit status, open workflow/approvals, AI/voice availability/usage summary and connector health; each card contains freshness timestamp/source endpoint.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/web test`; commit `feat: add command palette and unified dashboard`.

### Task 5: Implement tenant-private and shared/public knowledge libraries

**Files:**
- Create: `packages/knowledge/src/libraries.ts`
- Create: `packages/knowledge/src/library-policy.ts`
- Test: `packages/knowledge/src/library-policy.test.ts`
- Modify: `packages/data/src/schema/knowledge.ts`

**Interfaces:**
- Consumes: document versions and tenant/admin policy.
- Produces: library scopes `tenant_private`, `organization_shared`, `platform_public` and safe retrieval filters.

- [ ] **Step 1: Write isolation tests**

Tenant-private document never appears in another tenant retrieval, even when metadata/title is identical. Platform-public document is readable only after explicit publication workflow and contains no tenant-secret provenance.

- [ ] **Step 2: Implement publication policy**

Shared/public promotion creates a reviewed publication record referencing source document/version, redaction status, publisher, approval and publication timestamp; original tenant-private copy remains separate.

- [ ] **Step 3: Implement standards/books metadata**

Store content type, jurisdiction, edition, effective dates, publisher/author metadata, language and supersession link so retrieval can filter fresh/applicable standards without deleting historical editions.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/knowledge test`; commit `feat: add governed shared knowledge libraries`.

### Task 6: Implement freshness/deduplication policy for knowledge ingestion

**Files:**
- Create: `packages/knowledge/src/freshness.ts`
- Test: `packages/knowledge/src/freshness.test.ts`
- Modify: `apps/worker/src/jobs/knowledge-ingest.ts`

**Interfaces:**
- Consumes: source hash, document metadata/version/effective date and prior ingestion state.
- Produces: ingestion decision `duplicate|new_version|metadata_update|reject` and freshness flags.

- [ ] **Step 1: Write freshness tests**

Same hash/same metadata is duplicate; same logical source with newer edition/effective date is a new version; older superseded edition remains queryable but not selected by `current_only` filter.

- [ ] **Step 2: Implement freshness flags**

Expose `current`, `superseded`, `expired`, `future_effective` and `unknown` without guessing publication dates.

- [ ] **Step 3: Run and commit**

Run `pnpm --filter @new/knowledge test`; commit `feat: add knowledge freshness orchestration`.

### Task 7: Implement full operational metrics and stuck-run detection

**Files:**
- Create: `packages/observability/src/metrics.ts`
- Create: `packages/observability/src/stuck-runs.ts`
- Test: `packages/observability/src/stuck-runs.test.ts`
- Create: `apps/worker/src/jobs/operations-monitor.ts`

**Interfaces:**
- Consumes: API/queue/workflow/connector/report/AI/voice execution metadata.
- Produces: tenant-safe metrics and stuck-run alerts.

- [ ] **Step 1: Define metrics catalog**

Include request latency/error rate, queue depth/age, workflow run duration/status, connector sync latency/failures, AI call latency/tokens/errors, voice session duration/errors, report generation duration/failures and knowledge-ingest queue metrics.

- [ ] **Step 2: Write stuck-run tests**

Workflow/connector/report job exceeding configured heartbeat/lease threshold becomes `suspected_stuck`; active lease heartbeat prevents false alert; alert contains IDs/correlation only, not secret payload.

- [ ] **Step 3: Implement monitor job**

Periodic scan emits structured operational events and deduplicates repeated alerts until state changes/recovery occurs.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/observability test`; commit `feat: add platform metrics and stuck-run detection`.

### Task 8: Implement tenant AI/voice cost and usage reporting

**Files:**
- Create: `packages/observability/src/usage-cost.ts`
- Test: `packages/observability/src/usage-cost.test.ts`
- Create: `apps/api/src/routes/admin-usage.ts`
- Create: `apps/web/src/features/admin/operations/usage-cost.tsx`

**Interfaces:**
- Consumes: normalized AI/voice usage metadata and configurable provider price tables.
- Produces: tenant/provider/model/service usage totals and estimated/actual cost records with pricing version.

- [ ] **Step 1: Write exact cost tests**

Use integer/rational micro-cost units rather than binary floats; changing pricing table version changes subsequent estimates without rewriting historical usage records.

- [ ] **Step 2: Implement usage aggregation**

Group by tenant, provider, model, service (`ai_text`, `council`, `realtime_voice`, `stt`, `tts`), day/month and project/engagement where metadata permits.

- [ ] **Step 3: Build admin view**

Authorized admins can filter usage/cost trends and see whether numbers are provider-reported or estimated; no API keys/secret refs are rendered.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/observability test && pnpm --filter @new/api test && pnpm --filter @new/web test`; commit `feat: add AI and voice usage cost reporting`.

### Task 9: Complete accessibility and responsive regression coverage

**Files:**
- Create: `apps/web/e2e/accessibility.spec.ts`
- Create: `apps/web/e2e/responsive.spec.ts`
- Create: `apps/web/src/testing/workspace-routes.ts`

**Interfaces:**
- Consumes: all main workspace routes.
- Produces: browser coverage for keyboard navigation, directionality and desktop/tablet/mobile breakpoints.

- [ ] **Step 1: Define workspace route matrix**

Include Accounting, Audit, Reconciliation, Analytics, Evidence, Statements, Reports, Knowledge, Council, Voice, Workflows, Integrations and Administration.

- [ ] **Step 2: Write keyboard/semantics tests**

Verify skip/focus order, labeled navigation, dialog focus trap/restore, form labels and command-palette keyboard operation on representative critical routes.

- [ ] **Step 3: Write responsive tests**

At mobile/tablet/desktop widths assert navigation remains usable, tables expose accessible horizontal handling, charts have text summaries and RTL/LTR direction switches correctly.

- [ ] **Step 4: Run completion gate**

Run `pnpm --filter @new/identity test && pnpm --filter @new/knowledge test && pnpm --filter @new/observability test && pnpm --filter @new/web test && pnpm --filter @new/web test:e2e`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/identity packages/knowledge packages/observability apps/api apps/web apps/worker
git commit -m "feat: complete enterprise identity experience and observability"
```
