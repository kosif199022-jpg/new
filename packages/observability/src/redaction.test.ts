import { describe, expect, it } from 'vitest';
import { redactSensitive } from './redaction.js';

describe('redactSensitive', () => {
  it('redacts secrets recursively', () => {
    expect(redactSensitive({
      apiKey: 'abc',
      nested: { authorization: 'Bearer xyz', safe: 'ok' },
      list: [{ clientSecret: 'secret' }]
    })).toEqual({
      apiKey: '[REDACTED]',
      nested: { authorization: '[REDACTED]', safe: 'ok' },
      list: [{ clientSecret: '[REDACTED]' }]
    });
  });
});
