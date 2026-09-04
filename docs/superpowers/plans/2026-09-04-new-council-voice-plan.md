# NEW Council and Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement first-class multi-model councils plus governed Arabic/English realtime voice and knowledge-reader capabilities.

**Architecture:** Councils freeze an evidence/task packet, dispatch blind independent model seats, normalize findings, compute agreement/conflict matrices and require a human decision seat. Voice uses a server-side session broker that issues ephemeral realtime credentials or falls back to STT + text model + TTS; voice tools are read-only/proposal-only and cannot bypass financial or audit approval gates.

**Tech Stack:** TypeScript, PostgreSQL/Drizzle, WebRTC, WebSocket/SSE where needed, OpenAI/Anthropic/Gemini/OpenAI-compatible AI adapters, provider-neutral realtime/STT/TTS interfaces, object storage, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Blind council round one keeps provider/model outputs independent.
- Council consensus is never labeled professional approval.
- Human decision is mandatory before council output becomes an approved conclusion/workflow decision.
- Voice cannot post journals, reverse entries, approve materiality, sign evidence or issue final audit opinions.
- Long-lived provider secrets never reach the browser.
- Transcript/audio retention obeys tenant policy and provenance rules.

---

## File structure map

```text
packages/council/src/{types,freeze,dispatch,normalize,matrix,challenge,decision}/*
packages/voice/src/{types,policy,realtime,stt,tts,reader,session}/*
packages/data/src/schema/{council,voice}.ts
apps/realtime/src/*
apps/api/src/routes/{council,voice}.ts
apps/worker/src/jobs/{council,tts}.ts
apps/web/src/features/{council,voice}/*
apps/web/e2e/{council,voice}.spec.ts
```

### Task 1: Implement council definitions and frozen packets

**Files:**
- Create: `packages/council/src/types.ts`
- Create: `packages/council/src/freeze.ts`
- Test: `packages/council/src/freeze.test.ts`
- Create: `packages/data/src/schema/council.ts`
- Create: `packages/data/migrations/0007_council.sql`

**Interfaces:**
- Consumes: task text, evidence node IDs, source snapshot hashes and allowed seat definitions.
- Produces: immutable `CouncilPacket`, `CouncilRun`, `CouncilSeat` records.

- [ ] **Step 1: Write packet digest tests**

Same canonical task/evidence snapshot yields same digest; changing evidence ID/version/order normalization changes or preserves digest according to canonical sorting rules; raw timestamps are excluded from logical content digest.

- [ ] **Step 2: Implement council types**

```ts
export type CouncilType = 'audit_findings'|'accounting_treatment'|'statement_review'|'standards_research'|'risk'|'engineering_ops';
export interface CouncilSeat {id:string; providerId:string; model:string; roleLabel:string; enabled:boolean}
export interface CouncilPacket {id:string; tenantId:string; task:string; evidenceRefs:readonly string[]; sourceSnapshotHash:string; digest:string}
```

- [ ] **Step 3: Persist frozen packet**

Once run enters `dispatching`, packet content cannot change. A changed task/evidence set creates a new packet/run version.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/council test`; commit `feat: add frozen multi-model council packets`.

### Task 2: Implement blind independent round dispatch

**Files:**
- Create: `packages/council/src/dispatch.ts`
- Create: `packages/council/src/seat-prompt.ts`
- Test: `packages/council/src/dispatch.test.ts`
- Create: `apps/worker/src/jobs/council-round.ts`

**Interfaces:**
- Consumes: frozen packet and AI provider registry.
- Produces: independent raw seat execution records and normalized round status.

- [ ] **Step 1: Write blindness tests**

Round-one prompt for seat B must contain packet content and its own role only; it must not contain seat A response/provider/model identity. Dispatch order must not affect prompts.

- [ ] **Step 2: Implement seat prompt contract**

Require structured output fields: `findings[]`, `severity`, `evidenceRefs[]`, `uncertainty`, `conclusion`, `assumptions[]`. Council package calls AI execution through governed task policy with external tools disabled unless council type explicitly allows read-only research tools.

- [ ] **Step 3: Implement partial failure behavior**

Provider timeout/error marks only that seat failed; run can proceed if configured quorum of independent seats succeeds. Store failure metadata redacted and preserve retry count.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/council test`; commit `feat: add blind council dispatch`.

### Task 3: Normalize findings and compute matrices

**Files:**
- Create: `packages/council/src/normalize.ts`
- Create: `packages/council/src/matrix.ts`
- Test: `packages/council/src/normalize.test.ts`
- Test: `packages/council/src/matrix.test.ts`

**Interfaces:**
- Consumes: successful seat outputs.
- Produces: `NormalizedFinding[]`, agreement/conflict/evidence-gap matrices.

- [ ] **Step 1: Write normalization tests**

Normalize severity to `info|low|medium|high|critical`, reject evidence refs outside packet unless a research-enabled policy explicitly permits newly cited knowledge refs, preserve each seat's original text separately.

- [ ] **Step 2: Implement matrix contract**

```ts
interface CouncilMatrixRow {
  topicKey:string;
  seatPositions:Record<string,'agree'|'disagree'|'uncertain'|'silent'>;
  evidenceRefs:string[];
  gapFlags:string[];
}
```

- [ ] **Step 3: Compute without pretending semantic certainty**

Use explicit normalized topic keys supplied/derived by structured response plus conservative similarity threshold; ambiguous merges remain separate and surface a `possible_duplicate_topic` flag for human review.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/council test`; commit `feat: add council agreement and conflict matrices`.

### Task 4: Implement challenge rounds and human final decision

**Files:**
- Create: `packages/council/src/challenge.ts`
- Create: `packages/council/src/decision.ts`
- Test: `packages/council/src/challenge.test.ts`
- Test: `packages/council/src/decision.test.ts`

**Interfaces:**
- Consumes: matrix, selected conflict topics, human reviewer context.
- Produces: challenge round outputs and immutable `CouncilDecision` evidence/workflow event.

- [ ] **Step 1: Write challenge isolation tests**

Challenge prompt may quote normalized opposing positions but must not claim they were produced by a named provider if blind mode is configured. A model cannot write another seat's identity into authoritative metadata.

- [ ] **Step 2: Implement human decision schema**

```ts
interface CouncilDecision {runId:string; reviewerUserId:string; status:'accepted'|'challenged'|'rejected'; rationale:string; acceptedFindingIds:string[]; rejectedFindingIds:string[]; decidedAt:string}
```

Require `audit.approve`, `workflow.approve` or domain-specific mapped permission depending on council type.

- [ ] **Step 3: Link decision to evidence graph/workflow**

Create `human_decision` evidence node and workflow event; never promote council consensus directly to final audit/accounting authority.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/council test`; commit `feat: add challenged councils with human decisions`.

### Task 5: Implement voice policy and server-side realtime session broker

**Files:**
- Create: `packages/voice/src/types.ts`
- Create: `packages/voice/src/policy.ts`
- Create: `packages/voice/src/session-service.ts`
- Test: `packages/voice/src/policy.test.ts`
- Test: `packages/voice/src/session-service.test.ts`
- Create: `packages/data/src/schema/voice.ts`
- Create: `packages/data/migrations/0008_voice.sql`
- Create: `apps/realtime/src/server.ts`
- Create: `apps/api/src/routes/voice.ts`

**Interfaces:**
- Consumes: authenticated tenant/user/engagement context, provider realtime adapter.
- Produces: ephemeral voice session descriptor, policy-scoped tool list and retention metadata.

- [ ] **Step 1: Write forbidden-action tests**

Voice policy must exclude `accounting.post`, `accounting.reverse`, `audit.finalize_opinion`, `evidence.sign`, `materiality.override`, and generic unrestricted connector-write tools.

- [ ] **Step 2: Implement allowed tool classes**

Allow read-only ledger/trial balance/analytics/evidence/knowledge lookup plus proposal/note creation. Every tool call carries tenant/engagement context and correlation ID.

- [ ] **Step 3: Implement ephemeral credential broker**

Browser requests a session; server checks `voice.use`, policy and selected scope, then requests/creates short-lived provider credential or server-mediated session. Persist session metadata, not long-lived secret.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/voice test && pnpm --filter @new/api test`; commit `feat: add governed realtime voice sessions`.

### Task 6: Implement realtime transport and transcript provenance

**Files:**
- Create: `packages/voice/src/realtime/provider.ts`
- Create: `packages/voice/src/realtime/openai-realtime.ts`
- Create: `packages/voice/src/transcript.ts`
- Test: `packages/voice/src/transcript.test.ts`
- Create: `apps/realtime/src/session-router.ts`

**Interfaces:**
- Consumes: voice session descriptor and browser WebRTC offer/negotiation data.
- Produces: active realtime session, transcript events and tool-call trace.

- [ ] **Step 1: Write transcript ordering tests**

Out-of-order provider events are reordered/sequence-checked by event ID where possible; duplicate events are idempotently ignored; each transcript segment records speaker, start/end and source session ID.

- [ ] **Step 2: Implement provider-neutral events**

Normalize `audio_started`, `transcript_delta`, `transcript_final`, `tool_call`, `tool_result`, `session_error`, `session_closed`.

- [ ] **Step 3: Enforce retention policy**

Tenant policy independently controls transcript persistence and raw audio persistence. If audio retention is disabled, no object storage key is created for raw audio.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/voice test`; commit `feat: add realtime voice transport and provenance`.

### Task 7: Implement STT/text/TTS fallback and reader mode

**Files:**
- Create: `packages/voice/src/stt.ts`
- Create: `packages/voice/src/tts.ts`
- Create: `packages/voice/src/fallback-conversation.ts`
- Create: `packages/voice/src/reader.ts`
- Test: `packages/voice/src/fallback-conversation.test.ts`
- Test: `packages/voice/src/reader.test.ts`
- Create: `apps/worker/src/jobs/tts.ts`

**Interfaces:**
- Consumes: audio input or authorized canonical knowledge document.
- Produces: fallback conversational responses, synthesized section artifacts, bookmarks and resume position.

- [ ] **Step 1: Write fallback tests**

When realtime provider is unavailable and policy allows fallback, STT -> governed AI text task -> TTS runs with same scope/tool policy. If any stage fails permanently, return explicit degraded-mode error without pretending realtime success.

- [ ] **Step 2: Implement reader navigation**

Reader accepts document version and section IDs from knowledge package, stores progress `{documentVersionId, sectionId, offsetMs}` and bookmarks per user/tenant.

- [ ] **Step 3: Implement TTS artifact provenance**

Every generated audio object stores document/version/section refs, voice/provider/model, language, generation timestamp and SHA-256. Ambient audio is a separate track and never merged into provenance of spoken content.

- [ ] **Step 4: Run and commit**

Run `pnpm --filter @new/voice test`; commit `feat: add voice fallback and knowledge reader`.

### Task 8: Build council and voice user interfaces

**Files:**
- Create: `apps/api/src/routes/council.ts`
- Create: `apps/web/src/features/council/*`
- Create: `apps/web/src/features/voice/*`
- Create: `apps/web/e2e/council.spec.ts`
- Create: `apps/web/e2e/voice.spec.ts`

**Interfaces:**
- Consumes: council and voice APIs/realtime service.
- Produces: council setup/run/matrix/decision UI and voice advisor/reader UI.

- [ ] **Step 1: Build council UI**

Create run wizard, seat configuration, frozen packet summary, blind-round progress, agreement/conflict matrix, evidence-gap panel, challenge controls and human decision screen.

- [ ] **Step 2: Build voice advisor UI**

Mic permission state, selected tenant/entity/engagement, explicit retained/not-retained indicators, live transcript, cited/read-only tool results, proposal cards and a visible statement that voice cannot execute protected financial approvals.

- [ ] **Step 3: Build reader UI**

Document/section list, play/pause, speed, bookmarks, resume and Arabic/English voice choice through available configured providers.

- [ ] **Step 4: Write E2E tests**

Council: mock three seats with agreement/conflict, challenge one topic, record human decision. Voice: mock session creation, transcript events and forbidden tool attempt; verify forbidden action is blocked and shown as such.

- [ ] **Step 5: Run completion gate**

Run `pnpm --filter @new/council test && pnpm --filter @new/voice test && pnpm --filter @new/web test:e2e`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/council packages/voice apps/realtime apps/api/src/routes/council.ts apps/api/src/routes/voice.ts apps/web/src/features/council apps/web/src/features/voice apps/web/e2e/council.spec.ts apps/web/e2e/voice.spec.ts
git commit -m "feat: deliver councils and governed voice"
```
