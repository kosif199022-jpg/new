import type { FastifyInstance } from 'fastify';

export interface ReadinessCheck {
  name: string;
  check(): Promise<boolean>;
}

export async function registerHealthRoutes(app: FastifyInstance, checks: readonly ReadinessCheck[] = []): Promise<void> {
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async (_request, reply) => {
    const results = await Promise.all(checks.map(async (dependency) => {
      try {
        return { name: dependency.name, ok: await dependency.check() };
      } catch {
        return { name: dependency.name, ok: false };
      }
    }));
    const ready = results.every((result) => result.ok);
    return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', dependencies: results });
  });
}
