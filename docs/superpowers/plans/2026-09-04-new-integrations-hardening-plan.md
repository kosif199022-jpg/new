# NEW Integrations and Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the enterprise connector framework, concrete priority integrations, governed MCP/browser-agent surfaces, retention/security controls, operational resilience and production smoke coverage required for the full NEW platform.

**Architecture:** All external systems sit behind a typed connector SDK with declared auth, read/write capabilities, sync cursors, webhook semantics and idempotency. MCP and browser-agent access reuse workflow/permission policy rather than bypassing it. Security, retention and observability are cross-cutting packages with explicit production gates.

**Tech Stack:** TypeScript, Fastify, OAuth 2.0/OIDC adapters, PostgreSQL, BullMQ, Redis-compatible coordination, S3/R2 adapters, MCP SDK, OpenTelemetry, Vitest, Playwright, containerized integration mocks, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Connector credentials are tenant-isolated, encrypted-at-rest through a secret-store adapter and never exposed to browser logs/responses.
- Every write connector call requires an idempotency key and workflow/permission authority check.
- Sync cursors are monotonic/versioned and duplicate webhooks are safely replayable.
- MCP tools are explicitly allowlisted and risk-classified per tenant.
- Browser-agent tasks use scoped credentials, declared task intent and allowlisted domains.
- Financial authority actions remain human-gated even when an external connector can technically perform them.
- Retention and legal hold are enforceable platform primitives, not documentation-only policy.

---

## File structure map

```text
packages/integrations/src/{sdk,auth,sync,webhooks,secrets,connectors}/*
packages/retention/src/*
packages/observability/src/{metrics,cost,health}/*
apps/mcp/src/*
apps/api/src/routes/integrations.ts
apps/worker/src/jobs/connector-sync.ts
apps/web/src/features/integrations/*
apps/web/src/features/admin/*
.github/workflows/{ci,smoke}.yml
docs/operations/*
```

### Task 1: Implement connector SDK and secret-store boundary

**Files:**
- Create: `packages/integrations/src/sdk/types.ts`
- Create: `packages/integrations/src/sdk/connector.ts`
- Create: `packages/integrations/src/secrets/secret-store.ts`
- Create: `packages/integrations/src/secrets/envelope-secret-store.ts`
- Test: `packages/integrations/src/sdk/connector.test.ts`
- Test: `packages/integrations/src/secrets/envelope-secret-store.test.ts`
- Create: `packages/data/src/schema/integrations.ts`
- Create: `packages/data/migrations/0009_integrations.sql`

**Interfaces:**
- Consumes: `RequestContext`, object/data stores, workflow idempotency store.
- Produces: `Connector`, `ConnectorCapabilities`, `ConnectorAuth`, `SyncCursor`, `SecretStore`.

- [ ] **Step 1: Write connector contract tests**

A connector declaring `writes=false` cannot expose write operation descriptors; a write operation without idempotency requirement fails registration; connector IDs are stable semantic keys.

- [ ] **Step 2: Implement SDK contract**

```ts
interface ConnectorCapabilities {reads:boolean; writes:boolean; webhooks:boolean; incrementalSync:boolean}
interface ConnectorOperation<I,O> {key:string; mode:'read'|'write'; requiredPermission:string; execute(ctx:RequestContext,input:I,meta:{idempotencyKey?:string}):Promise<O>}
interface Connector {id:string; capabilities:ConnectorCapabilities; operations:ReadonlyMap<string,ConnectorOperation<unknown,unknown>>}
```

- [ ] **Step 3: Implement secret references**

Persistence stores only `secretRef`, provider/auth metadata and scope list. `SecretStore.get(ref)` is available server-side only; values are redacted by observability package.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test`; commit `feat: add governed connector SDK and secret boundary`.

### Task 2: Implement OAuth/service-account auth and connector lifecycle

**Files:**
- Create: `packages/integrations/src/auth/oauth2.ts`
- Create: `packages/integrations/src/auth/api-key.ts`
- Create: `packages/integrations/src/auth/service-account.ts`
- Create: `packages/integrations/src/connection-service.ts`
- Test: `packages/integrations/src/auth/oauth2.test.ts`
- Test: `packages/integrations/src/connection-service.test.ts`
- Create: `apps/api/src/routes/integrations.ts`

**Interfaces:**
- Consumes: Connector metadata and SecretStore.
- Produces: connection create/authorize/callback/disable/health lifecycle with scope metadata.

- [ ] **Step 1: Write OAuth state/PKCE tests**

Reject missing/mismatched state, expired state, wrong tenant/user and reused authorization state. PKCE verifier never appears in browser-readable persistence after callback completes.

- [ ] **Step 2: Implement auth adapters**

OAuth adapter supports authorization URL, callback token exchange, refresh and revocation hooks. API key/service account adapters validate presence/shape and store secret only through SecretStore.

- [ ] **Step 3: Implement connection lifecycle**

States: `draft`, `authorizing`, `active`, `degraded`, `disabled`, `revoked`. Health includes last successful call/sync, redacted error category and scope summary.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test && pnpm --filter @new/api test`; commit `feat: add connector auth lifecycle`.

### Task 3: Implement incremental sync, webhooks, retries and mapping

**Files:**
- Create: `packages/integrations/src/sync/types.ts`
- Create: `packages/integrations/src/sync/sync-runner.ts`
- Create: `packages/integrations/src/sync/schema-mapping.ts`
- Create: `packages/integrations/src/webhooks/verify.ts`
- Create: `packages/integrations/src/webhooks/deduplicate.ts`
- Test: `packages/integrations/src/sync/sync-runner.test.ts`
- Test: `packages/integrations/src/webhooks/deduplicate.test.ts`
- Create: `apps/worker/src/jobs/connector-sync.ts`

**Interfaces:**
- Consumes: connector read operations and mapping definitions.
- Produces: sync run records, monotonic cursor, staged canonical records, deduplicated webhook events.

- [ ] **Step 1: Write partial-sync tests**

If page 3/5 fails, committed cursor remains at last durable boundary and retry continues without duplicating prior records. Out-of-order stale cursor update is rejected.

- [ ] **Step 2: Implement mapping contract**

Mapping transforms external schema into staged internal records, never directly canonical journals. Store mapping version and source field lineage for each mapped record.

- [ ] **Step 3: Implement webhook verification**

Per connector adapter verifies signature/timestamp where provider supports it; event ID/content digest feeds dedupe store. Duplicate valid webhook returns success without repeating side effect.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test`; commit `feat: add reliable connector sync and webhooks`.

### Task 4: Implement ERP/accounting connector adapters

**Files:**
- Create: `packages/integrations/src/connectors/sap-s4hana.ts`
- Create: `packages/integrations/src/connectors/netsuite.ts`
- Create: `packages/integrations/src/connectors/business-central.ts`
- Create: `packages/integrations/src/connectors/odoo.ts`
- Create: `packages/integrations/src/connectors/quickbooks-online.ts`
- Create: `packages/integrations/src/connectors/xero.ts`
- Create: `packages/integrations/src/connectors/erp-common.ts`
- Test: `packages/integrations/src/connectors/erp-contract.test.ts`

**Interfaces:**
- Consumes: connector SDK/auth/sync services.
- Produces: normalized read operations for accounts, journals/transactions, customers/vendors and invoices/bills where provider APIs support them; governed write operations only where explicitly enabled.

- [ ] **Step 1: Define common ERP contract fixture**

```ts
interface ExternalLedgerRecord {externalId:string; postedAt:string; accountCode:string; description:string; debitMinor?:bigint; creditMinor?:bigint; currency:string; rawRef:string}
```

Contract test feeds mocked provider payloads and expects this normalized shape with provider-specific source metadata.

- [ ] **Step 2: Implement each adapter with mocked HTTP tests**

For SAP S/4HANA, NetSuite, Business Central, Odoo, QuickBooks Online and Xero implement auth metadata, pagination/cursor behavior, rate-limit classification and normalization. Provider-specific unsupported capabilities must be declared as unsupported rather than emulated silently.

- [ ] **Step 3: Enforce writes off by default**

All ERP adapters register read/sync first. Enabling a supported write operation requires tenant config plus explicit permission and workflow approval/idempotency contract.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test -- erp-contract`; commit `feat: add priority ERP connector adapters`.

### Task 5: Implement cloud document, email/calendar and CRM connectors

**Files:**
- Create: `packages/integrations/src/connectors/google-drive.ts`
- Create: `packages/integrations/src/connectors/microsoft-graph.ts`
- Create: `packages/integrations/src/connectors/s3.ts`
- Create: `packages/integrations/src/connectors/cloudflare-r2.ts`
- Create: `packages/integrations/src/connectors/salesforce.ts`
- Create: `packages/integrations/src/connectors/hubspot.ts`
- Test: `packages/integrations/src/connectors/productivity-contract.test.ts`

**Interfaces:**
- Consumes: connector SDK, knowledge/PBC import interfaces.
- Produces: governed document listing/fetch references, PBC email/calendar actions, CRM read/sync operations.

- [ ] **Step 1: Write scope tests**

Google/Microsoft connection with read-only file scope cannot send email; PBC email send operation requires messaging scope, dedicated permission and idempotency key. CRM connector cannot read objects outside configured allowlist.

- [ ] **Step 2: Implement document references**

Cloud file connectors return metadata/download-stream reference to server ingestion layer; never return provider bearer token or secret URL to browser when server proxy is required.

- [ ] **Step 3: Implement PBC communication operations**

Create draft/send notification and calendar event operations through workflow nodes. Store external message/event IDs and delivery status in PBC audit trail.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test -- productivity-contract`; commit `feat: add cloud productivity and CRM connectors`.

### Task 6: Implement database, GitHub, Cloudflare and banking adapters

**Files:**
- Create: `packages/integrations/src/connectors/postgresql.ts`
- Create: `packages/integrations/src/connectors/mysql.ts`
- Create: `packages/integrations/src/connectors/sqlserver.ts`
- Create: `packages/integrations/src/connectors/snowflake.ts`
- Create: `packages/integrations/src/connectors/bigquery.ts`
- Create: `packages/integrations/src/connectors/github.ts`
- Create: `packages/integrations/src/connectors/cloudflare.ts`
- Create: `packages/integrations/src/connectors/open-banking.ts`
- Test: `packages/integrations/src/connectors/data-ops-contract.test.ts`

**Interfaces:**
- Consumes: connector SDK; finance import/reconciliation staging; engineering council read contracts.
- Produces: read/sync adapters for data systems, engineering/operations evidence sources and bank feed normalized transactions.

- [ ] **Step 1: Write query safety tests**

Database adapters default to predefined/read-only query templates or allowlisted views. Reject arbitrary write SQL and multi-statement SQL in normal sync mode.

- [ ] **Step 2: Implement normalized bank-feed contract**

```ts
interface ExternalBankTransaction {externalId:string; bookedAt:string; valueAt?:string; amountMinor:bigint; currency:string; description:string; counterparty?:string; reference?:string}
```

Open-banking adapter is provider-neutral and region-specific implementations plug into it later without changing reconciliation logic.

- [ ] **Step 3: Implement GitHub/Cloudflare read operations**

Expose approved repository/issues/PR/workflow or Cloudflare zone/worker operational metadata for engineering/operations council tasks; side effects remain off unless separately allowlisted and workflow-gated.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test -- data-ops-contract`; commit `feat: add data banking and operations connectors`.

### Task 7: Implement governed MCP server and client

**Files:**
- Create: `apps/mcp/package.json`
- Create: `apps/mcp/src/server.ts`
- Create: `apps/mcp/src/tool-registry.ts`
- Create: `packages/integrations/src/mcp/risk.ts`
- Create: `packages/integrations/src/mcp/client.ts`
- Test: `apps/mcp/src/tool-registry.test.ts`
- Test: `packages/integrations/src/mcp/client.test.ts`

**Interfaces:**
- Consumes: domain read/proposal services, RequestContext, tenant MCP allowlist.
- Produces: governed MCP tools and approved external MCP client calls.

- [ ] **Step 1: Write risk classification tests**

Tools classify `read`, `proposal`, `write`, `financial_authority`. Tenant allowlist cannot elevate a `financial_authority` tool to automatic execution; it remains human-gated or unavailable.

- [ ] **Step 2: Register native tools explicitly**

Examples: read trial balance, retrieve cited knowledge, read evidence metadata, create AI proposal, inspect workflow. Do not auto-expose every internal API route.

- [ ] **Step 3: Implement client policy**

External MCP server config stores URL/transport/auth secretRef, allowed tool names and risk ceiling. Every call records correlation ID, server/tool, request digest, result digest and policy decision.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/mcp test && pnpm --filter @new/integrations test`; commit `feat: add governed MCP surfaces`.

### Task 8: Implement browser-agent task policy

**Files:**
- Create: `packages/integrations/src/browser-agent/types.ts`
- Create: `packages/integrations/src/browser-agent/policy.ts`
- Create: `packages/integrations/src/browser-agent/session.ts`
- Test: `packages/integrations/src/browser-agent/policy.test.ts`

**Interfaces:**
- Consumes: declared task, allowed domains, scoped credential references and workflow context.
- Produces: approved browser-agent session policy or denial.

- [ ] **Step 1: Write allowlist/action tests**

Navigation outside allowlisted domain fails; credential scope mismatch fails; protected financial action category fails even when domain is allowed; read-only extraction can pass when policy permits.

- [ ] **Step 2: Implement action classes**

Classify `navigate`, `read`, `download`, `form_fill`, `submit`, `financial_authority`. `submit` needs workflow approval according to task; `financial_authority` is never delegated to browser automation.

- [ ] **Step 3: Record session trace**

Persist task digest, domains, credential refs (not values), action decisions, screenshots/evidence refs where policy allows, and final result digest.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/integrations test -- browser-agent`; commit `feat: add controlled browser-agent policy`.

### Task 9: Implement retention, legal hold and data-residency policy

**Files:**
- Create: `packages/retention/src/types.ts`
- Create: `packages/retention/src/policy.ts`
- Create: `packages/retention/src/legal-hold.ts`
- Create: `packages/retention/src/purge-service.ts`
- Test: `packages/retention/src/purge-service.test.ts`

**Interfaces:**
- Consumes: resource classification, tenant policy, legal holds and object/data deletion adapters.
- Produces: purge decisions, hold blocks and auditable retention actions.

- [ ] **Step 1: Write legal-hold tests**

Expired evidence eligible for retention deletion must not be deleted when covered by active legal hold; unrelated resources purge normally; releasing hold does not delete immediately until next authorized purge run.

- [ ] **Step 2: Implement retention classes**

At minimum `accounting_record`, `audit_evidence`, `ai_execution`, `voice_transcript`, `voice_audio`, `report_artifact`, `connector_log`, each with tenant-configured duration constrained by deployment policy.

- [ ] **Step 3: Implement residency routing hook**

Policy returns allowed storage/provider regions for classified data. AI/voice/provider router consumes the same policy to disqualify incompatible provider endpoints.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/retention test`; commit `feat: enforce retention legal holds and residency policy`.

### Task 10: Implement security hardening and abuse controls

**Files:**
- Create: `apps/api/src/plugins/security.ts`
- Create: `apps/api/src/plugins/rate-limit.ts`
- Create: `packages/shared/src/security/origin.ts`
- Create: `packages/integrations/src/secrets/redaction-contract.test.ts`
- Test: `apps/api/src/plugins/security.test.ts`

**Interfaces:**
- Consumes: deployment origin/config and observability redaction.
- Produces: secure headers, CSP, origin/CSRF policy, upload/rate limits and secret-leak quality tests.

- [ ] **Step 1: Write header/origin tests**

Assert CSP, frame restrictions, MIME sniff protection, referrer policy and allowed-origin behavior. Cross-site state-changing request without valid origin/CSRF mechanism fails.

- [ ] **Step 2: Add rate-limit dimensions**

Apply per-IP unauthenticated, per-user/tenant authenticated, stricter AI/voice/connector mutation buckets and explicit `429` retry metadata without leaking internal quotas.

- [ ] **Step 3: Add secret leak fixture tests**

Feed fake provider keys/tokens through error/log paths and assert serialized logs/events contain `[REDACTED]` and never raw value.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/api test && pnpm --filter @new/integrations test`; commit `security: harden request and secret handling`.

### Task 11: Build integration/admin UX and operational dashboards

**Files:**
- Create: `apps/web/src/features/integrations/*`
- Create: `apps/web/src/features/admin/security/*`
- Create: `apps/web/src/features/admin/retention/*`
- Create: `apps/web/src/features/admin/operations/*`
- Create: `apps/web/e2e/integrations.spec.ts`

**Interfaces:**
- Consumes: integration/health/retention/usage APIs.
- Produces: connection catalog, auth/scope status, sync diagnostics, MCP allowlists, retention/legal hold admin and operational health views.

- [ ] **Step 1: Build connector catalog**

Show configured availability, authentication state, granted scopes, capabilities, last sync, health and provider-specific setup guidance without rendering stored secret values.

- [ ] **Step 2: Build sync/MCP/browser policy diagnostics**

Surface latest cursor, failures/retries, webhook status, allowed MCP tools/risk classes and browser-agent domain/action policies.

- [ ] **Step 3: Build security/retention views**

Authorized admins can view/edit retention classes, create/release legal holds, view AI/voice usage/cost summaries and operational alerts with audit-log trace.

- [ ] **Step 4: Write E2E connector flow**

Configure mocked connector, complete OAuth callback, run incremental sync twice, replay webhook, verify no duplicate staged records, disable connection and confirm subsequent calls fail cleanly.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/web test:e2e`; commit `feat: add enterprise integration administration UX`.

### Task 12: Production smoke, failure injection and release gate

**Files:**
- Create: `.github/workflows/smoke.yml`
- Create: `scripts/smoke-production.mjs`
- Create: `tests/failure/provider-outage.test.ts`
- Create: `tests/failure/duplicate-webhook.test.ts`
- Create: `tests/failure/queue-retry.test.ts`
- Create: `tests/failure/partial-sync.test.ts`
- Create: `docs/operations/deployment.md`
- Create: `docs/operations/rollback.md`
- Create: `docs/operations/disaster-recovery.md`

**Interfaces:**
- Consumes: deployed health endpoints and configured test tenant.
- Produces: repeatable production smoke result and failure-injection suite.

- [ ] **Step 1: Implement smoke script**

Check API live/ready, web shell Arabic route, authenticated tenant read, database migration version, queue health, connector health summary, AI provider configuration status without sending sensitive data, and realtime service health.

- [ ] **Step 2: Implement failure tests**

Provider outage returns governed fallback/degraded response; duplicate webhook produces one staged effect; queue retry does not duplicate side effect; partial sync resumes from durable cursor.

- [ ] **Step 3: Document deploy/rollback/DR exact commands**

Deployment doc names migration-before-traffic sequence, health gate and smoke command. Rollback doc separates app rollback from non-reversible DB migrations. DR doc defines restore validation and evidence/object-store integrity checks.

- [ ] **Step 4: Run full repository completion gate**

```bash
pnpm install --frozen-lockfile
pnpm check:legacy-copy
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
node scripts/smoke-production.mjs --base-url "$SMOKE_BASE_URL"
```

Expected: all commands pass; smoke exits 0 and emits no secrets.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/smoke.yml scripts/smoke-production.mjs tests/failure docs/operations
git commit -m "ops: add production hardening and release gates"
```
