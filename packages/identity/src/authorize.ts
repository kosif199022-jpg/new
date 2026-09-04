import { DomainError, assertAssurance, type AssuranceLevel, type RequestContext } from '@new/shared';
import type { Permission } from './permissions.js';

export function authorize(ctx: RequestContext, permission: Permission, assurance?: AssuranceLevel): void {
  if (!ctx.permissions.has(permission)) {
    throw new DomainError('forbidden', `Missing permission: ${permission}`, { permission });
  }
  if (assurance) assertAssurance(ctx, assurance);
}
