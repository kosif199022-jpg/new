import { randomUUID } from 'node:crypto';
import { buildRequestContext, type SessionIdentity } from '@new/identity';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export type SessionResolver = (request: FastifyRequest) => Promise<SessionIdentity | null>;

export async function registerContextPlugin(app: FastifyInstance, resolveSession: SessionResolver): Promise<void> {
  app.decorateRequest('ctx');
  app.addHook('onRequest', async (request, reply) => {
    const correlation = String(request.headers['x-correlation-id'] ?? randomUUID());
    reply.header('x-correlation-id', correlation);

    const session = await resolveSession(request);
    if (!session) {
      await reply.code(401).send({ error: 'unauthorized', correlationId: correlation });
      return;
    }

    const requestedTenant = request.headers['x-tenant-id'];
    if (typeof requestedTenant !== 'string' || !requestedTenant.trim()) {
      await reply.code(400).send({ error: 'tenant_required', correlationId: correlation });
      return;
    }

    try {
      request.ctx = buildRequestContext(session, requestedTenant, correlation);
    } catch {
      await reply.code(403).send({ error: 'tenant_forbidden', correlationId: correlation });
    }
  });
}
