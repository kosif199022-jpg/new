# NEW Full Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete NEW platform from an empty repository as a production-oriented Arabic-first accounting, audit, evidence, AI, council, voice, workflow, knowledge and enterprise-integration system.

**Architecture:** Implement the approved specification as a TypeScript monorepo with isolated domain packages and separate web, API, realtime, worker and MCP applications. Delivery is decomposed into subsystem plans so each slice is independently testable and reviewable while preserving stable contracts between slices.

**Tech Stack:** Node.js 22+, TypeScript 5.7+, pnpm 10+, Turborepo, React 19, Vite 7, Fastify 5, PostgreSQL 17, Drizzle ORM, Redis-compatible coordination, BullMQ, Vitest, Playwright, Zod, OpenTelemetry, WebRTC, OpenAI-compatible/Anthropic/Gemini adapters, S3-compatible object storage.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- New codebase, not a merge of old versions; uploaded repositories are reference material only.
- Arabic-first RTL and English-capable across UI, reports, knowledge and voice.
- Authoritative money/accounting logic is deterministic and never silently mutated by AI.
- Human approval is mandatory for posting, reversals, audit opinions, materiality overrides, evidence sign-off and side-effecting governed workflows.
- Tenant isolation is mandatory in persistence, APIs, jobs, evidence, AI execution records and connector credentials.
- Monetary values use exact decimals or integer minor units; never binary floating point for authoritative postings.
- Every external side effect is idempotent and traceable.
- Evidence and material AI outputs preserve provenance, actor, time, model/provider, citations where required and workflow correlation.
- No provider secret is exposed to the browser; voice uses ephemeral credentials.
- No bulk-copying application directories from uploaded projects.

---

## File structure map

```text
apps/
  web/                 # React PWA and Arabic-first UX
  api/                 # Fastify HTTP surface and auth boundary
  realtime/            # WebRTC/voice session broker
  worker/              # queues, imports, reports, sync jobs
  mcp/                 # governed MCP server
packages/
  shared/               # IDs, Result, errors, clocks, primitives
  data/                 # DB schema, migrations, tenant transaction helpers
  identity/             # auth context, RBAC, scopes and assurance
  accounting/           # ledger, journals, AR/AP, assets, inventory, tax, FX
  import/               # staged CSV/XLSX/OFX import contracts
  reconciliation/       # bank normalization and matching
  analytics/            # ratios, aging, anomalies, scenarios
  statements/           # statements, mappings, validation
  audit/                # engagements, risk, materiality, sampling, completion
  evidence/             # evidence graph, hashes, media, bundles, retention hooks
  reporting/            # PDF/XLSX/CSV/JSON reports
  workflow/             # DAG, approvals, leases, idempotency, retries
  ai/                   # provider registry, routing, governance, proposals
  knowledge-parsers/    # safe document parsing
  knowledge/            # canonical docs, libraries, retrieval, citations
  council/              # blind multi-model rounds and human decisions
  voice/                # realtime/TTS/STT abstractions and policies
  integrations/         # connector SDK and concrete adapters
  retention/            # retention/legal hold policy
  observability/        # logs, traces, metrics, usage/cost, health
  design-system/        # RTL tokens and accessible components
```

## Plan decomposition

- `2026-09-04-new-foundation-plan.md` — workspace, shared primitives, DB, identity, observability, web shell and CI.
- `2026-09-04-new-enterprise-experience-plan.md` — OIDC/MFA/scopes, PWA, command palette/dashboard, shared knowledge libraries, metrics and usage/cost.
- `2026-09-04-new-finance-plan.md` — accounting, imports, reconciliation, analytics, statements and reports.
- `2026-09-04-new-audit-evidence-plan.md` — audit lifecycle, evidence graph, PBC, misstatements and audit reporting.
- `2026-09-04-new-workflow-ai-knowledge-plan.md` — workflow engine, AI governance/providers, parsers, retrieval and citations.
- `2026-09-04-new-advanced-finance-audit-plan.md` — VAT/tax, FX, dimensions, advanced analytics/3D presentation, continuous audit, subsequent events and evidence media/redaction.
- `2026-09-04-new-council-voice-plan.md` — multi-model councils, realtime audio, STT/TTS and reader mode.
- `2026-09-04-new-integrations-hardening-plan.md` — connector SDK, enterprise adapters, MCP, browser-agent policy, retention, security and production hardening.

## Cross-plan interface contracts

```ts
export type TenantId = string & { readonly __brand: 'TenantId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };
export type Money = Readonly<{ currency: string; minor: bigint }>;
export type AssuranceLevel = 'single_factor' | 'mfa' | 'phishing_resistant';

export interface RequestContext {
  tenantId: TenantId;
  userId: UserId;
  correlationId: CorrelationId;
  permissions: ReadonlySet<string>;
  assurance?: AssuranceLevel;
}

export interface Provenance {
  actor: string;
  at: string;
  correlationId: CorrelationId;
  sourceRefs: readonly string[];
}
```

All plans must reuse these names and semantics. Later plans may extend request context through backwards-compatible optional fields but may not rename the core fields.

### Task 1: Establish repository execution order

**Files:**
- Create: `docs/architecture/implementation-order.md`
- Test: `scripts/check-plan-links.mjs`

**Interfaces:**
- Consumes: the eight subsystem plan paths listed above.
- Produces: a machine-checkable ordered list of implementation plans.

- [ ] **Step 1: Write the failing plan-link checker**

```js
import { readFileSync, existsSync } from 'node:fs';
const text = readFileSync('docs/architecture/implementation-order.md', 'utf8');
const paths = [...text.matchAll(/`(docs\/superpowers\/plans\/[^`]+\.md)`/g)].map(m => m[1]);
if (paths.length !== 8 || paths.some(path => !existsSync(path))) process.exit(1);
```

- [ ] **Step 2: Run it and verify it fails**

Run: `node scripts/check-plan-links.mjs`
Expected: non-zero because the implementation-order document does not exist yet.

- [ ] **Step 3: Create the implementation order document**

```md
# Implementation order
1. `docs/superpowers/plans/2026-09-04-new-foundation-plan.md`
2. `docs/superpowers/plans/2026-09-04-new-enterprise-experience-plan.md`
3. `docs/superpowers/plans/2026-09-04-new-finance-plan.md`
4. `docs/superpowers/plans/2026-09-04-new-audit-evidence-plan.md`
5. `docs/superpowers/plans/2026-09-04-new-workflow-ai-knowledge-plan.md`
6. `docs/superpowers/plans/2026-09-04-new-advanced-finance-audit-plan.md`
7. `docs/superpowers/plans/2026-09-04-new-council-voice-plan.md`
8. `docs/superpowers/plans/2026-09-04-new-integrations-hardening-plan.md`
```

- [ ] **Step 4: Run the checker and verify it passes**

Run: `node scripts/check-plan-links.mjs`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/implementation-order.md scripts/check-plan-links.mjs
git commit -m "docs: define full platform implementation order"
```

### Task 2: Enforce no legacy bulk-copying

**Files:**
- Create: `scripts/check-legacy-copy.mjs`
- Modify: `package.json`
- Test: `scripts/check-legacy-copy.mjs`

**Interfaces:**
- Consumes: repository file tree.
- Produces: `pnpm check:legacy-copy` quality gate.

- [ ] **Step 1: Write the guard script**

```js
import { readdirSync } from 'node:fs';
const banned = ['kosif-unified', 'kosif-stable-next', 'aurora-finance', 'sky-main', 'Acc-main', 'mahmoud1990'];
const roots = readdirSync('.', { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name);
const hits = roots.filter(name => banned.some(prefix => name.includes(prefix)));
if (hits.length) {
  console.error(`Legacy application trees are forbidden: ${hits.join(', ')}`);
  process.exit(1);
}
```

- [ ] **Step 2: Add script to root package.json**

```json
{"scripts":{"check:legacy-copy":"node scripts/check-legacy-copy.mjs"}}
```

Merge this key into the real root package.json created by the foundation plan; do not overwrite other scripts.

- [ ] **Step 3: Run the gate**

Run: `pnpm check:legacy-copy`
Expected: PASS with no legacy app directories.

- [ ] **Step 4: Add to CI quality command**

Run via CI with `pnpm check:legacy-copy && pnpm lint && pnpm typecheck && pnpm test`.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-legacy-copy.mjs package.json .github/workflows/ci.yml
git commit -m "chore: guard against legacy bulk copies"
```

## Full-platform completion gate

After all eight subsystem plans are green, execute:

```bash
pnpm install --frozen-lockfile
pnpm check:legacy-copy
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Expected: all commands pass, then run production smoke tests documented in the integrations/hardening plan.
