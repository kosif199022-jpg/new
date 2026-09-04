import { describe, expect, it } from 'vitest';
import { addMoney, money, subtractMoney } from './money.js';

describe('Money', () => {
  it('adds exact minor units', () => {
    expect(addMoney(money('sar', 125n), money('SAR', 75n))).toEqual({ currency: 'SAR', minor: 200n });
  });

  it('subtracts exact minor units', () => {
    expect(subtractMoney(money('SAR', 125n), money('SAR', 25n))).toEqual({ currency: 'SAR', minor: 100n });
  });

  it('rejects mixed currencies', () => {
    expect(() => addMoney(money('SAR', 1n), money('USD', 1n))).toThrow(/currency mismatch/i);
  });

  it('rejects invalid currency codes', () => {
    expect(() => money('RIYAL', 1n)).toThrow(/3-letter/i);
  });
});
