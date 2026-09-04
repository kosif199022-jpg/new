# NEW Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the production-ready monorepo, shared primitives, persistence, identity, observability, web shell and CI foundation required by every later subsystem.

**Architecture:** Use pnpm workspaces plus Turborepo. Keep platform primitives in focused packages; Fastify owns HTTP boundaries, React/Vite owns the browser UI, PostgreSQL/Drizzle owns canonical persistence, and every request carries a typed tenant/user/correlation context.

**Tech Stack:** Node.js 22+, TypeScript 5.7+, pnpm 10+, Turborepo, React 19, Vite 7, Fastify 5, Drizzle ORM, PostgreSQL 17, Zod, Vitest, Playwright, OpenTelemetry.

**Spec:** `docs/superpowers/specs/2026-09-04-new-full-platform-design.md`

## Global Constraints

- Arabic-first RTL and English-capable.
- Tenant ID is mandatory on persisted domain data.
- No financial authority is implemented in UI code.
- No provider or connector secret is exposed to the browser.
- Shared primitives must not depend on domain packages.
- New code only; no bulk-copy from reference repositories.

---

## File structure map

```text
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
eslint.config.mjs
apps/web/*
apps/api/*
packages/shared/*
packages/data/*
packages/identity/*
packages/observability/*
packages/design-system/*
.github/workflows/ci.yml
docker-compose.yml
```

### Task 1: Scaffold the workspace and deterministic quality commands

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Test: `packages/shared/src/version.test.ts`

**Interfaces:**
- Consumes: Node.js 22+ and pnpm 10+.
- Produces: root commands `lint`, `typecheck`, `test`, `build`, `test:integration`, `test:e2e`.

- [ ] **Step 1: Write the first failing test**

```ts
import { describe, expect, it } from 'vitest';
import { platformVersion } from './version.js';

describe('platformVersion', () => {
  it('returns a semantic initial version', () => {
    expect(platformVersion).toBe('0.1.0');
  });
});
```

- [ ] **Step 2: Create workspace manifests**

Root `package.json` must include:

```json
{
  "name": "new-platform",
  "private": true,
  "packageManager": "pnpm@10.15.0",
  "engines": {"node": ">=22"},
  "scripts": {
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "test:e2e": "turbo run test:e2e",
    "build": "turbo run build"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "turbo": "^2.5.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^3.0.0"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 3: Run test and confirm failure**

Run: `pnpm --filter @new/shared test`
Expected: FAIL because `src/version.ts` does not exist.

- [ ] **Step 4: Implement the minimum shared package**

```ts
export const platformVersion = '0.1.0' as const;
```

- [ ] **Step 5: Run quality commands**

Run: `pnpm install && pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.mjs .gitignore packages/shared
git commit -m "chore: scaffold NEW monorepo"
```

### Task 2: Implement shared IDs, money and request context

**Files:**
- Create: `packages/shared/src/ids.ts`
- Create: `packages/shared/src/money.ts`
- Create: `packages/shared/src/context.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/money.test.ts`
- Test: `packages/shared/src/context.test.ts`

**Interfaces:**
- Consumes: no domain package.
- Produces: `TenantId`, `UserId`, `CorrelationId`, `Money`, `RequestContext`, `assertPermission()`.

- [ ] **Step 1: Write failing Money tests**

```ts
import { expect, it } from 'vitest';
import { addMoney, money } from './money.js';

it('adds exact minor units', () => {
  expect(addMoney(money('SAR', 125n), money('SAR', 75n))).toEqual({currency: 'SAR', minor: 200n});
});

it('rejects mixed currencies', () => {
  expect(() => addMoney(money('SAR', 1n), money('USD', 1n))).toThrow(/currency/i);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @new/shared test -- money.test.ts`
Expected: FAIL because Money helpers are missing.

- [ ] **Step 3: Implement branded IDs and Money**

```ts
export type TenantId = string & {readonly __brand: 'TenantId'};
export type UserId = string & {readonly __brand: 'UserId'};
export type CorrelationId = string & {readonly __brand: 'CorrelationId'};

export type Money = Readonly<{currency: string; minor: bigint}>;
export const money = (currency: string, minor: bigint): Money => ({currency, minor});
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Money currency mismatch');
  return {currency: a.currency, minor: a.minor + b.minor};
}
```

- [ ] **Step 4: Implement request context permission guard**

```ts
export interface RequestContext {
  tenantId: TenantId;
  userId: UserId;
  correlationId: CorrelationId;
  permissions: ReadonlySet<string>;
}
export function assertPermission(ctx: RequestContext, permission: string): void {
  if (!ctx.permissions.has(permission)) throw new Error(`Missing permission: ${permission}`);
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @new/shared test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src
git commit -m "feat: add tenant context and exact money primitives"
```

### Task 3: Add PostgreSQL schema and tenant-safe transaction boundary

**Files:**
- Create: `packages/data/package.json`
- Create: `packages/data/src/schema/core.ts`
- Create: `packages/data/src/client.ts`
- Create: `packages/data/src/tenant-transaction.ts`
- Create: `packages/data/drizzle.config.ts`
- Create: `packages/data/migrations/0000_core.sql`
- Test: `packages/data/src/tenant-transaction.test.ts`
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `TenantId`, `RequestContext` from `@new/shared`.
- Produces: `db`, `withTenantTransaction(ctx, fn)`, core tables `tenants`, `users`, `memberships`, `audit_log`.

- [ ] **Step 1: Write failing tenant transaction test**

```ts
it('sets tenant context before executing a callback', async () => {
  const calls: string[] = [];
  const fakeTx = {execute: async (sql: unknown) => calls.push(String(sql))};
  await withTenantTransaction(fakeTx as never, ctx, async () => 'ok');
  expect(calls.join(' ')).toContain(String(ctx.tenantId));
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @new/data test`
Expected: FAIL because the package is not implemented.

- [ ] **Step 3: Implement core schema**

Core tables must include tenant-scoped UUID primary keys, timestamps, unique membership constraint `(tenant_id,user_id)`, and an append-only `audit_log` with actor, action, resource type/id, correlation ID and JSON metadata.

- [ ] **Step 4: Implement tenant transaction helper**

```ts
export async function withTenantTransaction<T>(db: DbLike, ctx: RequestContext, fn: (tx: DbLike) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    return fn(tx);
  });
}
```

- [ ] **Step 5: Add local PostgreSQL and migration commands**

`docker-compose.yml` uses PostgreSQL 17 with a named volume and local-only credentials. Add package scripts `db:generate`, `db:migrate`, `test:integration`.

- [ ] **Step 6: Run migration integration test**

Run: `docker compose up -d postgres && pnpm --filter @new/data db:migrate && pnpm --filter @new/data test:integration`
Expected: PASS and tenant A queries cannot read tenant B seeded rows.

- [ ] **Step 7: Commit**

```bash
git add packages/data docker-compose.yml
git commit -m "feat: add tenant-isolated persistence foundation"
```

### Task 4: Implement identity, RBAC and HTTP request context

**Files:**
- Create: `packages/identity/src/permissions.ts`
- Create: `packages/identity/src/authorize.ts`
- Create: `packages/identity/src/session.ts`
- Test: `packages/identity/src/authorize.test.ts`
- Create: `apps/api/package.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/plugins/context.ts`
- Test: `apps/api/src/server.test.ts`

**Interfaces:**
- Consumes: `RequestContext`, membership data.
- Produces: `Permission` union, `authorize(ctx, permission)`, Fastify decorated `request.ctx`.

- [ ] **Step 1: Write RBAC failing test**

```ts
it('denies posting without accounting.post', () => {
  expect(() => authorize(ctxWith(['accounting.read']), 'accounting.post')).toThrow(/accounting.post/);
});
```

- [ ] **Step 2: Implement permission catalog**

Include at minimum `accounting.read`, `accounting.post`, `accounting.reverse`, `audit.read`, `audit.approve`, `evidence.sign`, `workflow.approve`, `ai.use`, `voice.use`, `integrations.manage`, `admin.manage`.

- [ ] **Step 3: Add API context plugin**

Resolve authenticated user, selected tenant and permissions, reject missing tenant membership, generate/preserve correlation ID, and expose only sanitized auth state to handlers.

- [ ] **Step 4: Write API integration tests**

Verify `401` for no session, `403` for wrong tenant, `200` for valid membership, and `x-correlation-id` is returned.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @new/identity test && pnpm --filter @new/api test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/identity apps/api
git commit -m "feat: add RBAC and tenant request context"
```

### Task 5: Add observability primitives and health endpoints

**Files:**
- Create: `packages/observability/src/logger.ts`
- Create: `packages/observability/src/telemetry.ts`
- Create: `packages/observability/src/redaction.ts`
- Test: `packages/observability/src/redaction.test.ts`
- Create: `apps/api/src/routes/health.ts`
- Test: `apps/api/src/routes/health.test.ts`

**Interfaces:**
- Consumes: `CorrelationId`, optional tenant metadata.
- Produces: structured logger, trace initializer, `redactSensitive()`, `/health/live`, `/health/ready`.

- [ ] **Step 1: Write redaction failing tests**

```ts
it('redacts secrets recursively', () => {
  expect(redactSensitive({apiKey:'abc', nested:{authorization:'Bearer xyz'}})).toEqual({apiKey:'[REDACTED]', nested:{authorization:'[REDACTED]'}});
});
```

- [ ] **Step 2: Implement redaction keys and safe logging**

Redact case-insensitive keys matching `authorization`, `cookie`, `apiKey`, `token`, `secret`, `password`, `clientSecret`, and known provider key names.

- [ ] **Step 3: Add liveness/readiness endpoints**

Liveness returns process status only; readiness checks PostgreSQL and required queue/coordination dependencies without leaking credentials.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @new/observability test && pnpm --filter @new/api test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/observability apps/api/src/routes/health*
git commit -m "feat: add telemetry redaction and health checks"
```

### Task 6: Build the Arabic-first design system and web shell

**Files:**
- Create: `packages/design-system/src/tokens.css`
- Create: `packages/design-system/src/button.tsx`
- Create: `packages/design-system/src/card.tsx`
- Create: `packages/design-system/src/index.ts`
- Test: `packages/design-system/src/button.test.tsx`
- Create: `apps/web/package.json`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app.tsx`
- Create: `apps/web/src/layout/app-shell.tsx`
- Create: `apps/web/src/i18n/ar.ts`
- Create: `apps/web/src/i18n/en.ts`
- Test: `apps/web/src/app.test.tsx`

**Interfaces:**
- Consumes: API endpoint URL and authenticated session state later.
- Produces: RTL-aware components and route shell for Accounting, Audit, Reconciliation, Analytics, Evidence, Statements, Reports, Knowledge, Council, Voice, Workflows, Integrations, Administration.

- [ ] **Step 1: Write failing RTL shell test**

```tsx
render(<App locale="ar" />);
expect(document.documentElement.dir).toBe('rtl');
expect(screen.getByText('المحاسبة')).toBeInTheDocument();
```

- [ ] **Step 2: Implement design tokens and accessible primitives**

Tokens cover spacing, typography, radii, focus ring, semantic surfaces and logical CSS properties (`margin-inline`, `padding-inline`) rather than left/right assumptions.

- [ ] **Step 3: Implement app shell and locale switch**

Arabic is default; switching to English changes `lang` and `dir=ltr`. Navigation uses semantic labels, visible focus states and mobile drawer behavior.

- [ ] **Step 4: Run component and accessibility smoke tests**

Run: `pnpm --filter @new/design-system test && pnpm --filter @new/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system apps/web
git commit -m "feat: add Arabic-first web foundation"
```

### Task 7: Add CI and browser smoke test

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `apps/web/e2e/shell.spec.ts`
- Create: `apps/web/playwright.config.ts`

**Interfaces:**
- Consumes: all root quality scripts.
- Produces: reproducible pull-request quality gate and a real-browser RTL smoke test.

- [ ] **Step 1: Write the browser smoke test**

```ts
test('Arabic shell loads and exposes main workspaces', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('navigation')).toContainText('التدقيق');
});
```

- [ ] **Step 2: Create CI workflow**

Use Node 22, pnpm cache, PostgreSQL service, `pnpm install --frozen-lockfile`, migrations, `lint`, `typecheck`, unit/integration tests, build and Playwright Chromium smoke test.

- [ ] **Step 3: Run locally**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build && pnpm --filter @new/web test:e2e`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml apps/web/e2e apps/web/playwright.config.ts
git commit -m "ci: add full foundation quality gate"
```
