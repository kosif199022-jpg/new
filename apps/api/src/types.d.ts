import type { RequestContext } from '@new/shared';

declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}
