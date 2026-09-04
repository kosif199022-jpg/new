import { expect, it } from 'vitest';
import { createLogger } from './logger.js';

it('redacts sensitive fields before sending them to the sink', () => {
  const records: Readonly<Record<string, unknown>>[] = [];
  const logger = createLogger({ write: (record) => records.push(record) });
  logger.error('provider failed', { token: 'top-secret', status: 500 });
  expect(records[0]).toMatchObject({
    message: 'provider failed',
    data: { token: '[REDACTED]', status: 500 }
  });
});
