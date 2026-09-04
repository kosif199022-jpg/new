import { buildServer } from './server.js';

const app = await buildServer({
  logger: true,
  resolveSession: async () => null
});

const port = Number(process.env.PORT ?? 3001);
await app.listen({ host: '0.0.0.0', port });
