import { expect, it } from 'vitest';
import { tenantId } from './ids.js';

it('rejects blank identifiers', () => {
  expect(() => tenantId('   ')).toThrow(/must not be empty/);
});
