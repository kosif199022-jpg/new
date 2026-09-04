# NEW Workflow, AI and Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement governed workflows, multi-provider AI routing/governance, safe knowledge ingestion, retrieval and citation validation as reusable platform services.

**Architecture:** Workflow is a typed DAG engine with resumability, approvals and idempotency. AI is a proposal/analysis layer behind provider adapters and policy evaluation. Knowledge ingestion is isolated from request handling; parsed documents become canonical chunks with provenance and retrieval outputs are citation-validated before publishable AI answers are accepted.

**Tech Stack:** TypeScript, PostgreSQL/Drizzle, BullMQ, Redis-compatible coordination, Zod, Vitest, object storage, PDF/DOCX/XLSX/CSV parsers, vector-search adapter, OpenAI/Anthropic/Gemini/OpenAI-compatible adapters.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Side-effecting workflow nodes require explicit authority classification and idempotency keys.
- Human approvals are cryptographically bound to workflow/run/checkpoint/user/session digest and expiration.
- AI outputs are proposals/analysis, not silent financial mutations.
- Knowledge citations are mandatory whenever task policy requires them.
- Parser failures never expose arbitrary file execution or bypass upload preflight.
- Provider credentials stay server-side and are redacted from logs.

---

## File structure map

```text
packages/workflow/src/{types,graph,runner,leases,approvals,idempotency,retry}/*
packages/ai/src/{types,registry,router,policy,execution,providers}/*
packages/knowledge-parsers/src/*
packages/knowledge/src/{documents,chunks,retrieval,citations,ingestion}/*
packages/data/src/schema/{workflow,ai,knowledge}.ts
apps/worker/src/jobs/{workflow,knowledge-ingest}.ts
apps/api/src/routes/{workflows,ai,knowledge}.ts
apps/web/src/features/{workflows,ai,knowledge}/*
```

### Task 1: Implement typed workflow graphs and validation

**Files:**
- Create: `packages/workflow/src/types.ts`
- Create: `packages/workflow/src/validate-graph.ts`
- Test: `packages/workflow/src/validate-graph.test.ts`

**Interfaces:**
- Consumes: stable node IDs and typed node definitions.
- Produces: `WorkflowDefinition`, `WorkflowNode`, `validateWorkflow(definition)`.

- [ ] **Step 1: Write failing graph tests**

Reject cycles, duplicate node IDs, missing dependencies, unknown authority class and a side-effect node without declared idempotency strategy.

- [ ] **Step 2: Implement node contract**

```ts
export type AuthorityClass = 'deterministic'|'read_only'|'ai'|'human'|'side_effect';
export interface WorkflowNode {
  id:string;
  kind:string;
  dependsOn:readonly string[];
  authority:AuthorityClass;
  inputSchemaKey:string;
  outputSchemaKey:string;
  idempotency?:'required'|'derived';
}
```

- [ ] **Step 3: Implement DAG validation**

Use Kahn/topological validation, return structured diagnostics, and preserve a deterministic topological order for equal dependency sets by sorting IDs.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/workflow test`; commit `feat: add typed governed workflow definitions`.

### Task 2: Implement execution, checkpoints, leases and retries

**Files:**
- Create: `packages/workflow/src/runner.ts`
- Create: `packages/workflow/src/lease-service.ts`
- Create: `packages/workflow/src/checkpoint-service.ts`
- Create: `packages/workflow/src/retry.ts`
- Create: `packages/data/src/schema/workflow.ts`
- Create: `packages/data/migrations/0004_workflow.sql`
- Test: `packages/workflow/src/runner.test.ts`
- Test: `packages/workflow/src/lease-service.test.ts`

**Interfaces:**
- Consumes: validated workflow, node handlers, request context.
- Produces: `startWorkflow()`, `resumeWorkflow()`, immutable node execution records and resumable checkpoints.

- [ ] **Step 1: Write parallelism/resume tests**

Two independent read-only nodes may execute concurrently; dependent node waits. A crashed run resumes from completed checkpoint without re-running completed side effects.

- [ ] **Step 2: Implement lease contract**

A run lease includes `runId`, `holderId`, `fence`, `expiresAt`; acquisition increments fence and handlers reject stale fence tokens.

- [ ] **Step 3: Implement retries**

Classify errors into `permanent`, `retryable`, `approval_required`; exponential backoff with jitter applies only to retryable nodes. Exhausted jobs enter dead-letter state with trace metadata.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/workflow test`; commit `feat: add resumable workflow runner`.

### Task 3: Implement human approval challenges and idempotency

**Files:**
- Create: `packages/workflow/src/approval-challenge.ts`
- Create: `packages/workflow/src/idempotency-store.ts`
- Test: `packages/workflow/src/approval-challenge.test.ts`
- Test: `packages/workflow/src/idempotency-store.test.ts`

**Interfaces:**
- Consumes: workflow digest, checkpoint, user/session IDs, secret signing material.
- Produces: `createApprovalChallenge()`, `verifyApprovalChallenge()`, idempotent side-effect execution guard.

- [ ] **Step 1: Write tamper/expiry tests**

Change checkpoint, user, workflow digest or expiration and verification must fail; replay after successful use must fail.

- [ ] **Step 2: Implement challenge payload**

```ts
interface ApprovalChallengePayload {
  runId:string; workflowDigest:string; checkpointId:string; approvalKey:string;
  tenantId:string; userId:string; sessionId:string; expiresAt:string; nonce:string;
}
```

Sign canonical payload using server-held HMAC/Ed25519 adapter and persist one-time nonce consumption.

- [ ] **Step 3: Implement idempotency store**

Store `(tenant_id, operation_key, idempotency_key)` plus request digest and result reference; identical replay returns existing result, mismatched payload with same key fails.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/workflow test`; commit `feat: add workflow approvals and idempotency`.

### Task 4: Implement AI provider registry and policy router

**Files:**
- Create: `packages/ai/src/types.ts`
- Create: `packages/ai/src/registry.ts`
- Create: `packages/ai/src/policy.ts`
- Create: `packages/ai/src/router.ts`
- Create: `packages/ai/src/providers/openai.ts`
- Create: `packages/ai/src/providers/anthropic.ts`
- Create: `packages/ai/src/providers/gemini.ts`
- Create: `packages/ai/src/providers/openai-compatible.ts`
- Test: `packages/ai/src/router.test.ts`

**Interfaces:**
- Consumes: task requirement and tenant AI policy.
- Produces: `AIProvider`, `AITaskPolicy`, `selectProvider()`, normalized `AIResponse`.

- [ ] **Step 1: Write routing tests**

Provider not on allowlist is never selected; data-residency restriction outranks cost; missing required audio/tool capability disqualifies provider; fallback occurs only if policy allows.

- [ ] **Step 2: Implement provider contract**

```ts
interface AIProvider {
  id:string;
  capabilities:ReadonlySet<'text'|'vision'|'audio'|'tools'|'json'>;
  execute(req:AIRequest):Promise<AIResponse>;
}
```

Normalize usage, model ID, provider request ID, latency and safety/error metadata.

- [ ] **Step 3: Implement task policy**

Policy includes allowed input classes, citations required, allowed proposal kinds, human-review requirement, external-tool permission, sensitivity ceiling and retention class.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/ai test`; commit `feat: add multi-provider AI policy router`.

### Task 5: Implement governed AI execution and proposal storage

**Files:**
- Create: `packages/ai/src/execution-service.ts`
- Create: `packages/ai/src/proposals.ts`
- Create: `packages/data/src/schema/ai.ts`
- Create: `packages/data/migrations/0005_ai.sql`
- Test: `packages/ai/src/execution-service.test.ts`
- Create: `apps/api/src/routes/ai.ts`

**Interfaces:**
- Consumes: request context, task policy, provider registry, optional knowledge citations.
- Produces: immutable `AIExecutionRecord`, typed `AIProposal` and policy diagnostics.

- [ ] **Step 1: Write authority tests**

An AI task requesting `journal.post` as a direct output must fail policy validation; `journal_draft_proposal` is allowed when configured.

- [ ] **Step 2: Implement execution record**

Store prompt/input digest rather than secret-bearing raw payload by default, provider/model, policy version, source refs, citations, token/usage metadata, redacted errors and output artifact/proposal IDs.

- [ ] **Step 3: Implement proposal types**

At minimum `journal_draft`, `audit_finding`, `opinion_draft`, `workflow_suggestion`, `narrative_explanation`, `mapping_suggestion`. Each proposal has `proposed`, `accepted`, `rejected` state and human decision metadata when accepted/rejected.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/ai test && pnpm --filter @new/api test`; commit `feat: add governed AI execution records`.

### Task 6: Implement safe knowledge parsers

**Files:**
- Create: `packages/knowledge-parsers/src/types.ts`
- Create: `packages/knowledge-parsers/src/preflight.ts`
- Create: `packages/knowledge-parsers/src/pdf.ts`
- Create: `packages/knowledge-parsers/src/docx.ts`
- Create: `packages/knowledge-parsers/src/xlsx.ts`
- Create: `packages/knowledge-parsers/src/csv.ts`
- Test: `packages/knowledge-parsers/src/*.test.ts`

**Interfaces:**
- Consumes: verified upload bytes/reference.
- Produces: `CanonicalDocument {title, sections, tables, metadata, sourceHash}`.

- [ ] **Step 1: Write parser preflight tests**

Reject encrypted/unsupported PDFs when parser cannot safely process them, zip bombs/oversized DOCX/XLSX, MIME-extension mismatch and workbook macros where policy forbids them.

- [ ] **Step 2: Implement parser isolation contract**

Parsers receive byte buffers/object refs and resource limits, never arbitrary paths from user input; output contains text/table structures only, not executable content.

- [ ] **Step 3: Normalize documents**

Each section has stable section ID, ordinal, text, page/sheet provenance where available and source hash.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/knowledge-parsers test`; commit `feat: add safe document parsers`.

### Task 7: Implement canonical knowledge store, chunking and retrieval

**Files:**
- Create: `packages/knowledge/src/document-service.ts`
- Create: `packages/knowledge/src/chunk.ts`
- Create: `packages/knowledge/src/retrieval.ts`
- Create: `packages/data/src/schema/knowledge.ts`
- Create: `packages/data/migrations/0006_knowledge.sql`
- Test: `packages/knowledge/src/chunk.test.ts`
- Test: `packages/knowledge/src/retrieval.test.ts`
- Create: `apps/worker/src/jobs/knowledge-ingest.ts`

**Interfaces:**
- Consumes: `CanonicalDocument`, embedding/search adapter.
- Produces: immutable document versions, chunks, metadata filters and `retrieve(query,scope)` results.

- [ ] **Step 1: Write deterministic chunking tests**

Same canonical document and chunk-policy version yields identical chunk IDs; chunk never crosses tenant/document boundaries and retains section/page provenance.

- [ ] **Step 2: Implement versioned document storage**

Deduplicate identical source hash per tenant/library policy, but preserve metadata/version history when same file is reintroduced under a new publication/edition context.

- [ ] **Step 3: Implement retrieval adapter**

Support lexical/vector/hybrid strategy behind interface and require scope filters for tenant, library, jurisdiction, edition and optional engagement.

- [ ] **Step 4: Add ingestion fencing**

Use job key + source hash + fence token so duplicate workers do not publish duplicate chunk sets.

- [ ] **Step 5: Run and commit**

Run `pnpm --filter @new/knowledge test`; commit `feat: add provenance-aware knowledge retrieval`.

### Task 8: Implement citation validation and publishable answers

**Files:**
- Create: `packages/knowledge/src/citations.ts`
- Create: `packages/knowledge/src/answer-service.ts`
- Test: `packages/knowledge/src/citations.test.ts`
- Test: `packages/knowledge/src/answer-service.test.ts`
- Create: `apps/api/src/routes/knowledge.ts`

**Interfaces:**
- Consumes: retrieved chunks and AI response.
- Produces: validated `Citation[]` and answer status `draft|publishable|rejected`.

- [ ] **Step 1: Write citation integrity tests**

Citation to chunk not present in retrieved evidence fails; wrong document version fails; quoted span must exist within cited chunk normalization window.

- [ ] **Step 2: Implement citation contract**

```ts
interface Citation {documentId:string; versionId:string; chunkId:string; sectionId:string; locator:string; quote?:string}
```

- [ ] **Step 3: Enforce policy**

If task policy requires citations, AI answer cannot be `publishable` until every material factual claim mapped by the response structure has at least one valid citation or is explicitly labeled inference/opinion.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/knowledge test && pnpm --filter @new/api test`; commit `feat: validate cited knowledge answers`.

### Task 9: Implement workflow studio and knowledge/AI UI

**Files:**
- Create: `apps/api/src/routes/workflows.ts`
- Create: `apps/web/src/features/workflows/*`
- Create: `apps/web/src/features/ai/*`
- Create: `apps/web/src/features/knowledge/*`
- Create: `apps/web/e2e/workflow-ai-knowledge.spec.ts`

**Interfaces:**
- Consumes: workflow, AI and knowledge APIs.
- Produces: workflow authoring/simulation/run diagnostics, AI proposal review UI and standards/library search with citations.

- [ ] **Step 1: Build workflow editor data model UI**

Allow adding typed nodes, dependencies and authority badges; invalid graph shows structured validation errors before save.

- [ ] **Step 2: Build execution diagnostics**

Show node state, retries, checkpoint, correlation ID, approval challenge and dead-letter reason; never display raw secrets/provider authorization headers.

- [ ] **Step 3: Build AI/knowledge UX**

Show provider/model metadata where policy allows, source citations, proposal accept/reject controls and Arabic-first document search/reader.

- [ ] **Step 4: Write E2E flow**

Create workflow with deterministic -> AI -> human approval -> side-effect mock node, ingest a document, ask cited question, accept a proposal and confirm workflow resumes once without duplicated side effect.

- [ ] **Step 5: Run completion gate**

Run `pnpm --filter @new/workflow test && pnpm --filter @new/ai test && pnpm --filter @new/knowledge-parsers test && pnpm --filter @new/knowledge test && pnpm --filter @new/web test:e2e`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/workflow packages/ai packages/knowledge-parsers packages/knowledge apps/api/src/routes/workflows.ts apps/api/src/routes/ai.ts apps/api/src/routes/knowledge.ts apps/web/src/features/workflows apps/web/src/features/ai apps/web/src/features/knowledge apps/web/e2e/workflow-ai-knowledge.spec.ts
git commit -m "feat: deliver workflow AI and knowledge platform"
```
