import { describe, expect, it } from 'vitest';
import { assertAssurance, assertPermission, type RequestContext } from './context.js';
import { correlationId, tenantId, userId } from './ids.js';

const context = (permissions: string[], assurance: RequestContext['assurance'] = 'single_factor'): RequestContext => ({
  tenantId: tenantId('tenant-1'),
  userId: userId('user-1'),
  correlationId: correlationId('corr-1'),
  permissions: new Set(permissions),
  assurance
});

describe('RequestContext', () => {
  it('requires explicit permissions', () => {
    expect(() => assertPermission(context(['accounting.read']), 'accounting.post')).toThrow(/accounting.post/);
  });

  it('accepts available permissions', () => {
    expect(() => assertPermission(context(['accounting.post']), 'accounting.post')).not.toThrow();
  });

  it('enforces assurance levels', () => {
    expect(() => assertAssurance(context([], 'single_factor'), 'mfa')).toThrow(/mfa/i);
    expect(() => assertAssurance(context([], 'phishing_resistant'), 'mfa')).not.toThrow();
  });
});
