import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';

let app: FastifyInstance | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

const session = {
  userId: '22222222-2222-4222-8222-222222222222',
  assurance: 'mfa' as const,
  memberships: [{
    tenantId: '11111111-1111-4111-8111-111111111111',
    permissions: ['accounting.read']
  }]
};

describe('API request context', () => {
  it('returns 401 without a session', async () => {
    app = await buildServer({ resolveSession: async () => null });
    const response = await app.inject({ method: 'GET', url: '/api/session', headers: { 'x-tenant-id': session.memberships[0]!.tenantId } });
    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for a tenant outside membership', async () => {
    app = await buildServer({ resolveSession: async () => session });
    const response = await app.inject({ method: 'GET', url: '/api/session', headers: { 'x-tenant-id': '99999999-9999-4999-8999-999999999999' } });
    expect(response.statusCode).toBe(403);
  });

  it('returns a valid session and correlation id', async () => {
    app = await buildServer({ resolveSession: async () => session });
    const response = await app.inject({ method: 'GET', url: '/api/session', headers: { 'x-tenant-id': session.memberships[0]!.tenantId, 'x-correlation-id': 'corr-test' } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('corr-test');
    expect(response.json()).toMatchObject({ tenantId: session.memberships[0]!.tenantId, assurance: 'mfa' });
  });
});
