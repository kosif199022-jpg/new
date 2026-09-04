import type { CorrelationId, EngagementId, EntityId, OrganizationId, TenantId, UserId } from './ids.js';

export type AssuranceLevel = 'single_factor' | 'mfa' | 'phishing_resistant';

export interface AccessScope {
  tenantId: TenantId;
  organizationId?: OrganizationId;
  entityId?: EntityId;
  engagementId?: EngagementId;
}

export interface RequestContext {
  tenantId: TenantId;
  userId: UserId;
  correlationId: CorrelationId;
  permissions: ReadonlySet<string>;
  assurance?: AssuranceLevel;
  scope?: AccessScope;
}

export function assertPermission(ctx: RequestContext, permission: string): void {
  if (!ctx.permissions.has(permission)) throw new Error(`Missing permission: ${permission}`);
}

const assuranceRank: Record<AssuranceLevel, number> = {
  single_factor: 1,
  mfa: 2,
  phishing_resistant: 3
};

export function assertAssurance(ctx: RequestContext, required: AssuranceLevel): void {
  const actual = ctx.assurance ?? 'single_factor';
  if (assuranceRank[actual] < assuranceRank[required]) {
    throw new Error(`Authentication assurance ${required} required`);
  }
}
