import { describe, expect, it } from 'vitest';
import { validateJournal } from './validate-journal.js';

const base = {
  currency: 'SAR',
  memo: 'قيد بيع نقدي',
  reference: 'SALE-001'
} as const;

describe('validateJournal', () => {
  it('rejects a journal when debits do not equal credits', () => {
    const result = validateJournal({ ...base, lines: [
      { accountId: 'cash', debitMinor: 100n, creditMinor: 0n },
      { accountId: 'sales', debitMinor: 0n, creditMinor: 90n }
    ] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('journal_unbalanced');
  });

  it('accepts a structurally valid balanced journal', () => {
    expect(validateJournal({ ...base, lines: [
      { accountId: 'cash', debitMinor: 100n, creditMinor: 0n },
      { accountId: 'sales', debitMinor: 0n, creditMinor: 100n }
    ] })).toEqual({ ok: true, totalMinor: 100n });
  });

  it('requires at least two lines', () => {
    const result = validateJournal({ ...base, lines: [
      { accountId: 'cash', debitMinor: 100n, creditMinor: 0n }
    ] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('journal_requires_two_lines');
  });

  it('rejects a line that debits and credits at the same time', () => {
    const result = validateJournal({ ...base, lines: [
      { accountId: 'cash', debitMinor: 100n, creditMinor: 100n },
      { accountId: 'sales', debitMinor: 0n, creditMinor: 0n }
    ] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('line_must_have_exactly_one_side');
  });

  it('rejects negative amounts and missing memo/reference', () => {
    const result = validateJournal({
      currency: 'SAR', memo: ' ', reference: '', lines: [
        { accountId: 'cash', debitMinor: -1n, creditMinor: 0n },
        { accountId: 'sales', debitMinor: 0n, creditMinor: 1n }
      ]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('line_amount_negative');
      expect(result.errors).toContain('memo_required');
      expect(result.errors).toContain('reference_required');
    }
  });
});
