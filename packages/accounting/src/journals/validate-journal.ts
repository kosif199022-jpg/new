import type {
  JournalDraft,
  JournalValidationError,
  JournalValidationResult
} from './types.js';

export function validateJournal(draft: JournalDraft): JournalValidationResult {
  const errors = new Set<JournalValidationError>();

  if (!draft.currency.trim()) errors.add('currency_required');
  if (!draft.memo.trim()) errors.add('memo_required');
  if (!draft.reference.trim()) errors.add('reference_required');
  if (draft.lines.length < 2) errors.add('journal_requires_two_lines');

  let totalDebitMinor = 0n;
  let totalCreditMinor = 0n;

  for (const line of draft.lines) {
    if (!line.accountId.trim()) errors.add('account_required');
    if (line.debitMinor < 0n || line.creditMinor < 0n) {
      errors.add('line_amount_negative');
    }

    const hasDebit = line.debitMinor > 0n;
    const hasCredit = line.creditMinor > 0n;
    if (hasDebit === hasCredit) errors.add('line_must_have_exactly_one_side');

    totalDebitMinor += line.debitMinor;
    totalCreditMinor += line.creditMinor;
  }

  if (totalDebitMinor !== totalCreditMinor) errors.add('journal_unbalanced');

  if (errors.size > 0) {
    return { ok: false, errors: [...errors] };
  }

  return { ok: true, totalMinor: totalDebitMinor };
}
