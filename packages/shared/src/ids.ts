export type Brand<T, B extends string> = T & { readonly __brand: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type EntityId = Brand<string, 'EntityId'>;
export type EngagementId = Brand<string, 'EngagementId'>;

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty`);
  return normalized;
}

export const tenantId = (value: string): TenantId => nonEmpty(value, 'TenantId') as TenantId;
export const userId = (value: string): UserId => nonEmpty(value, 'UserId') as UserId;
export const correlationId = (value: string): CorrelationId => nonEmpty(value, 'CorrelationId') as CorrelationId;
export const organizationId = (value: string): OrganizationId => nonEmpty(value, 'OrganizationId') as OrganizationId;
export const entityId = (value: string): EntityId => nonEmpty(value, 'EntityId') as EntityId;
export const engagementId = (value: string): EngagementId => nonEmpty(value, 'EngagementId') as EngagementId;
