import {
  DomainError,
  correlationId,
  tenantId,
  userId,
  type AssuranceLevel,
  type CorrelationId,
  type RequestContext
} from '@new/shared';
import { isPermission } from './permissions.js';

export interface SessionMembership {
  tenantId: string;
  permissions: readonly string[];
}

export interface SessionIdentity {
  userId: string;
  assurance?: AssuranceLevel;
  memberships: readonly SessionMembership[];
}

export function buildRequestContext(
  session: SessionIdentity,
  requestedTenantId: string,
  requestCorrelationId: string
): RequestContext {
  const membership = session.memberships.find((item) => item.tenantId === requestedTenantId);
  if (!membership) {
    throw new DomainError('forbidden', 'User is not a member of the requested tenant');
  }
  const validPermissions = membership.permissions.filter(isPermission);
  return {
    tenantId: tenantId(requestedTenantId),
    userId: userId(session.userId),
    correlationId: correlationId(requestCorrelationId) as CorrelationId,
    permissions: new Set(validPermissions),
    ...(session.assurance ? { assurance: session.assurance } : {})
  };
}
