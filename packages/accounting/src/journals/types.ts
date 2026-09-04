export interface JournalLineDraft {
  accountId: string;
  debitMinor: bigint;
  creditMinor: bigint;
}

export interface JournalDraft {
  currency: string;
  memo: string;
  reference: string;
  lines: readonly JournalLineDraft[];
}

export type JournalValidationError =
  | 'journal_requires_two_lines'
  | 'line_must_have_exactly_one_side'
  | 'line_amount_negative'
  | 'journal_unbalanced'
  | 'memo_required'
  | 'reference_required'
  | 'currency_required'
  | 'account_required';

export type JournalValidationResult =
  | { ok: true; totalMinor: bigint }
  | { ok: false; errors: readonly JournalValidationError[] };
