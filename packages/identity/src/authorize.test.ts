import { describe, expect, it } from 'vitest';
import { correlationId, tenantId, userId, type RequestContext } from '@new/shared';
import { authorize } from './authorize.js';

const ctx = (permissions: string[], assurance: RequestContext['assurance'] = 'single_factor'): RequestContext => ({
  tenantId: tenantId('11111111-1111-4111-8111-111111111111'),
  userId: userId('22222222-2222-4222-8222-222222222222'),
  correlationId: correlationId('corr'),
  permissions: new Set(permissions),
  assurance
});

describe('authorize', () => {
  it('denies posting without accounting.post', () => {
    expect(() => authorize(ctx(['accounting.read']), 'accounting.post')).toThrow(/accounting.post/);
  });

  it('requires configured assurance', () => {
    expect(() => authorize(ctx(['accounting.post']), 'accounting.post', 'mfa')).toThrow(/mfa/i);
    expect(() => authorize(ctx(['accounting.post'], 'mfa'), 'accounting.post', 'mfa')).not.toThrow();
  });
});
