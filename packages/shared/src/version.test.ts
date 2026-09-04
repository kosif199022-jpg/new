import { describe, expect, it } from 'vitest';
import { platformVersion } from './version.js';

describe('platformVersion', () => {
  it('returns a semantic initial version', () => {
    expect(platformVersion).toBe('0.1.0');
  });
});
