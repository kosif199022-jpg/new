import Fastify, { type FastifyInstance } from 'fastify';
import { registerContextPlugin, type SessionResolver } from './plugins/context.js';
import { registerHealthRoutes, type ReadinessCheck } from './routes/health.js';

export interface ServerOptions {
  resolveSession: SessionResolver;
  logger?: boolean;
  readinessChecks?: readonly ReadinessCheck[];
}

export async function buildServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  await registerHealthRoutes(app, options.readinessChecks ?? []);
  await registerContextPlugin(app, options.resolveSession);
  app.get('/api/session', async (request) => ({
    tenantId: request.ctx.tenantId,
    userId: request.ctx.userId,
    permissions: [...request.ctx.permissions],
    assurance: request.ctx.assurance ?? 'single_factor'
  }));
  return app;
}
