import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/**/*.ts',
  out: './generated-migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://new:new@localhost:5432/new'
  }
});
