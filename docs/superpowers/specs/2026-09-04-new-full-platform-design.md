# NEW Full Platform — Design Specification

**Date:** 2026-09-04  
**Repository:** `kosif199022-jpg/new`  
**Status:** Design for review  
**Goal:** Build a new Arabic-first financial, accounting, audit, evidence, AI, voice, workflow, knowledge and enterprise-integration platform. The uploaded projects are reference material only. Their useful product ideas, domain rules and behavioral contracts may inform this design, but their implementation is not to be copied wholesale.

## 1. Product principles

1. **New codebase, not a merge of old versions.** We re-implement useful capabilities behind new interfaces and tests.
2. **Deterministic finance first.** Money, posting, trial balances, reconciliations, materiality, sampling, statements and approval gates are deterministic domain code. AI may explain or propose but cannot silently change authoritative records.
3. **Human authority is explicit.** Posting, reversals, audit opinions, materiality overrides, evidence sign-off and side-effecting workflows require authorized human approval.
4. **Arabic-first / RTL, English-capable.** Arabic is a first-class locale across UI, reports, voice and knowledge retrieval.
5. **Evidence and traceability by default.** Every material automated output is linked to inputs, model/provider if AI was used, citations when knowledge was used, actor, timestamp and workflow trace.
6. **Enterprise isolation.** Multi-tenant boundaries, permissions, retention, legal hold, data residency policy and connector scopes are platform primitives.
7. **Provider independence.** AI, voice, storage, databases and external systems are used through adapters so the platform can route or replace providers without rewriting domain modules.

## 2. Target architecture

Use a TypeScript monorepo with clear package boundaries. Proposed shape:

```text
apps/
  web/                 # React/Vite Arabic-first PWA
  api/                 # HTTP/API edge application
  realtime/            # WebRTC/voice session endpoints
  worker/              # queues, imports, report generation, long jobs
  mcp/                 # MCP server for controlled external tool access
packages/
  accounting/
  audit/
  reconciliation/
  analytics/
  statements/
  evidence/
  reporting/
  workflow/
  ai/
  council/
  voice/
  knowledge/
  knowledge-parsers/
  import/
  integrations/
  identity/
  data/
  retention/
  observability/
  design-system/
  shared/
```

The architecture intentionally takes the strongest boundary ideas seen in the reference projects, while replacing version-specific coupling with stable domain contracts.

## 3. Data and infrastructure

### Canonical stores
- **PostgreSQL** for tenants, users, accounting records, audit engagements, workflow state, AI execution metadata and report metadata.
- **Object storage** for evidence files, imported workbooks, report artifacts, audio recordings and media attachments.
- **Queue** for parsing, report generation, knowledge ingestion, connector sync and long-running analyses.
- **Ephemeral/coordination store** for locks, resumable workflow leases, realtime session state and rate limits.

### Core invariants
- Tenant ID is required in every persisted domain object.
- Monetary values use integer minor units or exact decimal types; never binary floating point for authoritative postings.
- Journal batches are immutable after posting. Corrections use controlled reversal/adjustment entries.
- Evidence objects are content-hashed and can be sealed into verifiable bundles.
- Imports pass staged validation before they can affect canonical accounting or audit data.
- Every side effect accepts an idempotency key.

## 4. Accounting capability set

Implement a full accounting core rather than a dashboard-only layer:

- Chart of accounts and account hierarchy.
- Journal entries, balanced-entry validation, posting and reversal.
- Trial balance and period balances.
- General ledger drill-down.
- Accounts receivable and payable.
- Customer and supplier invoices.
- Cash, bank and petty-cash separation.
- Bank reconciliation with normalization, matching, confidence scoring, exceptions and governed exclusions.
- Fixed assets and depreciation schedules.
- Inventory movements, weighted-average costing and valuation checks.
- Period close readiness and close checklist.
- VAT/tax calculation hooks and tax analytics.
- Cost centers, projects and dimensions.
- Multi-currency transaction metadata and controlled FX valuation interfaces.
- Comparative periods and financial-statement mappings.
- Accounting capability center exposing each calculator/control independently for UI, API and AI tools.

The accounting package never imports UI or AI packages.

## 5. Financial statements and reporting

### Statements
- Statement of financial position.
- Profit or loss / comprehensive income.
- Cash-flow statement through configurable mapping.
- Changes in equity.
- Comparative periods.
- Structural validation: balance checks, mapping completeness, sign conventions, arithmetic consistency and disclosure warnings.

### Reports
- PDF, XLSX, CSV and JSON exports.
- Branded Arabic/English templates.
- Audit-ready evidence bundles and machine-readable manifests.
- ERP/management reports, sales reports, aging, reconciliation, risk register and audit execution reports.
- Report generation is asynchronous for heavy artifacts and produces immutable versions.

## 6. Audit platform

Implement the full engagement lifecycle:

- Engagement setup, team, entity, period and scope.
- Planning, risk assessment and assertion mapping.
- Materiality and performance materiality with documented overrides.
- Audit program/procedures and ownership.
- Sampling engine and coverage metrics.
- Journal-entry testing and anomaly-driven selections.
- PBC request lists and client response tracking.
- Evidence capture, indexing, linking and sufficiency status.
- Misstatement register, aggregation and disposition.
- Review notes and clearance workflow.
- Going-concern/continuity assessment.
- Completion checklist and subsequent-events tracking.
- Draft audit opinion assistant with mandatory human approval.
- Continuous-audit runs over newly ingested data.
- Complete sign-off trail for preparer, reviewer and final approver.

## 7. Evidence graph and media

Evidence is more than file storage:

- Nodes: source document, transaction, account, test, finding, risk, assertion, AI analysis, human decision, report section.
- Edges: supports, contradicts, derived-from, sampled-from, reviewed-by, resolves, cites.
- Cryptographic hashes and bundle seals.
- Verification endpoint for evidence bundles.
- Screen capture, image, audio and reviewer-media attachments where permitted.
- Evidence redaction and export policy.
- Retention and legal-hold integration.

## 8. Analytics and financial intelligence

Provide deterministic analytical functions with explainable inputs:

- Financial ratios and KPI library.
- Trend and variance analysis.
- Receivable/payable aging.
- Anomaly detection rules.
- Benford analysis where methodologically appropriate.
- Altman-style distress indicators as clearly labeled analytical signals, not conclusions.
- Forecasting interfaces with scenario/version tracking.
- Risk scoring and heatmaps.
- Tax/VAT analytical checks.
- Sales executive analytics.
- Inventory and margin analytics.
- Reconciliation quality metrics.
- Optional advanced/3D visualizations only as presentation layers over canonical analytics outputs.

## 9. AI control plane

### Provider abstraction
Support multiple providers through a common contract. The initial registry should be able to route OpenAI, Anthropic, Gemini and local/public models when configured, without hard-coding business logic to any provider.

### Routing policy
Routing can consider:
- required capabilities;
- provider allowlist;
- cost tier;
- latency class;
- jurisdiction/data-residency policy;
- context window;
- fallback permission;
- tenant policy.

### AI governance
Each AI task declares:
- allowed input classes;
- whether knowledge citations are required;
- allowed proposal kinds;
- human-review requirement;
- whether external tools may be called;
- maximum data sensitivity;
- retention policy for prompts/results.

AI outputs are stored as proposals/analysis, never as silent authoritative accounting mutations.

## 10. Multi-model councils

Create a first-class `council` package and UI, not a one-off page.

### Council flow
1. A task and evidence packet are frozen.
2. Eligible seats receive the same prompt independently in a **blind first round**.
3. Responses are normalized into findings, severity, evidence references, uncertainty and conclusion.
4. The council engine builds agreement/conflict/evidence-gap matrices.
5. Optional challenge rounds are run without allowing one provider to impersonate another.
6. A human seat reviews the matrix and records accept/challenge/reject decisions.
7. The decision becomes an evidence-graph node and workflow event.

### Council types
- Audit findings council.
- Accounting treatment council.
- Financial-statement review council.
- Source/standards research council.
- Risk council.
- Engineering/operations council for platform diagnostics.

Consensus must never be labeled as professional approval.

## 11. Voice and realtime

Voice is a full platform capability with two modes.

### Realtime financial/audit advisor
- Browser WebRTC audio session.
- Arabic and English speech.
- Ephemeral session credentials; long-lived provider secrets never exposed to the browser.
- Context limited to the selected tenant/entity/engagement and explicit evidence packet.
- Voice may query read-only tools and create proposals/notes.
- Posting, approvals, materiality changes and audit opinions are forbidden voice side effects.
- Transcript and audio retention are tenant-policy controlled.

### Knowledge reader / audiobook mode
- TTS for authorized knowledge documents.
- Chapter/section navigation.
- Playback speed, bookmarks and resume position.
- Optional ambient audio mixing isolated from the spoken track.
- Generated audio artifacts have provenance and source-document linkage.

Fallback STT + text model + TTS adapters are supported when realtime conversational audio is unavailable.

## 12. Knowledge and standards library

- Safe ingestion for PDF, DOCX, XLSX and CSV.
- Preflight checks and parser isolation.
- Canonical document model, chunking and metadata.
- Retrieval with source citations.
- Citation validation before an AI answer is marked publishable when citations are required.
- Standards library with jurisdiction/edition metadata.
- Books/reference library and reader experience.
- Knowledge ingestion orchestration with deduplication, freshness and fencing to prevent duplicate workers.
- Tenant-private libraries and optional shared public libraries with explicit boundaries.

## 13. Workflow studio and control plane

Build a governed DAG workflow engine:

- Typed nodes and dependencies.
- Deterministic/read-only/AI/human/side-effect authority classes.
- Parallel execution where dependencies permit.
- Checkpoints and resumability.
- Human approval challenges cryptographically bound to user/session, workflow digest, checkpoint, approval key and expiration.
- Resume leases preventing duplicate execution.
- Idempotency for side effects.
- Retry policy and dead-letter handling.
- Full execution trace and observability correlation IDs.
- Visual workflow studio for authoring, simulation and diagnostics.

Examples: month-end close, bank reconciliation, PBC collection, audit sampling, financial-statement validation, connector import, management reporting.

## 14. Enterprise integrations

### Integration framework
Every connector implements common capabilities:
- OAuth/API-key/service-account authentication adapter;
- scopes and permissions;
- read/write capability declaration;
- incremental sync cursor;
- schema mapping;
- rate limiting and retry;
- webhook ingestion where available;
- idempotent write contract;
- tenant-secret isolation;
- health and last-sync status.

### Connector families
- ERP/accounting systems.
- Banking/open-banking adapters plus file-based OFX/CSV/XLSX ingestion.
- Cloud storage/document systems.
- Email/calendar for controlled PBC and workflow notifications.
- CRM/sales systems.
- Data warehouses/databases.
- GitHub/engineering sources for engineering-council workflows.
- Cloudflare/edge operations where the deployment uses Cloudflare.

### MCP
- Native MCP server exposing explicitly governed KOSIF tools.
- MCP client for approved external servers.
- OAuth flow where supported.
- Per-tool risk classification and tenant allowlist.
- Tool calls recorded in the workflow/audit trace.

### Browser agent
A controlled browser-agent integration is available only through declared tasks, scoped credentials, allowlisted domains and action policies. Financial authority actions remain human-gated.

## 15. Identity, permissions and security

- Tenant, organization, entity and engagement scopes.
- RBAC plus fine-grained permission checks for posting, evidence, AI, connectors and approvals.
- SSO/OIDC-ready identity adapter.
- MFA capability through identity provider.
- Encrypted secrets with no browser exposure.
- Content Security Policy and secure headers.
- CSRF/origin protections where applicable.
- Upload limits, parser sandboxing and file-type validation.
- Rate limits and abuse controls.
- Structured audit log for security-sensitive events.
- Data-residency policy hooks.
- Retention schedules and legal holds.
- Redaction of secrets and sensitive fields from AI execution logs.

## 16. Observability and operations

- Structured logs with tenant-safe metadata.
- Metrics for API, queues, connectors, AI, voice, report generation and workflow execution.
- Distributed correlation IDs.
- Error tracking and health endpoints.
- Connector health dashboard.
- Workflow stuck-run detection.
- Cost and usage reporting for AI/voice by tenant.
- CI quality gate, production smoke tests and rollback-ready deployment process.

## 17. Web product and design system

- Arabic-first responsive PWA, desktop/tablet/mobile.
- RTL-aware design tokens and components.
- Accessible keyboard navigation and screen-reader semantics.
- Unified command/search palette.
- Dashboard with financial health, audit status, workflow queue, AI/voice status and integration health.
- Dedicated workspaces for Accounting, Audit, Reconciliation, Analytics, Evidence, Statements, Reports, Knowledge, Council, Voice, Workflows, Integrations and Administration.
- No version-number pages or legacy naming in the product surface.

## 18. API boundaries

All packages expose typed domain functions. The API layer maps HTTP requests to application services. External surfaces use versioned contracts where necessary, but internal filenames and UI labels stay semantic rather than `v38/v61/v67` style.

Representative resource groups:

```text
/api/accounting/*
/api/reconciliation/*
/api/audit/*
/api/evidence/*
/api/analytics/*
/api/statements/*
/api/reports/*
/api/knowledge/*
/api/ai/*
/api/council/*
/api/voice/*
/api/workflows/*
/api/integrations/*
/api/admin/*
```

## 19. Testing strategy

Every major capability ships with tests before or alongside implementation:

- Unit tests for money, journals, materiality, sampling, matching, ratios and evidence hashes.
- Property/invariant tests for balanced postings and reconciliation conservation.
- Golden tests for reports/statements.
- Contract tests for AI providers, voice, MCP and connectors using mocks.
- Workflow approval/idempotency/resume tests.
- Database migration tests and tenant-isolation tests.
- Security tests for secret leakage, upload handling, authorization and redaction.
- Browser E2E tests for critical accounting/audit flows.
- Accessibility tests and responsive visual baselines.
- Failure-injection tests for provider outages, duplicate webhooks, queue retries and partial connector sync.

Reference-project tests are behavioral inspiration; new tests are written against the new contracts.

## 20. Delivery slices

The complete scope is large, so implementation is sliced without removing requested capabilities:

1. **Foundation:** workspace, design system, identity, data, observability, CI.
2. **Deterministic finance:** accounting, imports, reconciliation, analytics, statements.
3. **Audit/evidence:** engagements, lifecycle, materiality, sampling, evidence graph, reports.
4. **Workflow:** orchestrator, approvals, checkpoints, studio.
5. **AI/knowledge:** provider registry, governance, parsers, retrieval, citations.
6. **Council:** blind rounds, matrix, challenge rounds, human decision evidence.
7. **Voice:** realtime advisor, transcript governance, TTS/reader fallback.
8. **Enterprise integrations:** connector SDK, MCP, OAuth, browser agent, priority connectors.
9. **Operational hardening:** security, retention/legal hold, performance, cost controls, disaster recovery and production smoke suites.

These slices are implementation order only. The product target remains the full capability set described in this specification.

## 21. Acceptance criteria for the full platform

The platform is considered functionally complete when a tenant can:

1. Import source accounting data safely.
2. Maintain authoritative ledgers and trial balances.
3. Reconcile banks and resolve exceptions.
4. Produce and validate financial statements and management reports.
5. Run an audit engagement from planning through completion with evidence and sign-offs.
6. Run deterministic analytics and trace every result to inputs.
7. Ingest and cite knowledge sources.
8. Ask AI for governed analysis without granting it hidden accounting authority.
9. Run multi-model councils with blind independence and human final decision.
10. Hold an Arabic/English voice session that can analyze but cannot bypass approval gates.
11. Build and resume governed workflows with human checkpoints.
12. Connect approved external systems through scoped connectors/MCP/OAuth/browser-agent policies.
13. Export evidence and report artifacts with provenance.
14. Demonstrate tenant isolation, retention, observability, security controls and reproducible CI tests.

## 22. Explicit non-copy rule

Implementation work must not bulk-copy application directories from the uploaded projects. We may reuse general domain knowledge, concepts, algorithms that are not source-specific, behavioral expectations, test ideas and architecture lessons. When a useful legacy behavior is selected, it is re-specified through a new contract and implemented in the new module structure. This keeps `new` maintainable and prevents old version coupling from becoming the architecture.
