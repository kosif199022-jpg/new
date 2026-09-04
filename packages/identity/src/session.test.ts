import { describe, expect, it } from 'vitest';
import { buildRequestContext } from './session.js';

describe('buildRequestContext', () => {
  const session = {
    userId: '22222222-2222-4222-8222-222222222222',
    assurance: 'mfa' as const,
    memberships: [
      { tenantId: '11111111-1111-4111-8111-111111111111', permissions: ['accounting.read', 'unknown.permission'] }
    ]
  };

  it('builds a context only for an existing membership', () => {
    const ctx = buildRequestContext(session, '11111111-1111-4111-8111-111111111111', 'corr-1');
    expect(ctx.permissions.has('accounting.read')).toBe(true);
    expect(ctx.permissions.has('unknown.permission')).toBe(false);
  });

  it('rejects a different tenant', () => {
    expect(() => buildRequestContext(session, '99999999-9999-4999-8999-999999999999', 'corr-1')).toThrow(/not a member/i);
  });
});
