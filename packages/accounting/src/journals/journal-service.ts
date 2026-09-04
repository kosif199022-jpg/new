import { and, eq, inArray } from 'drizzle-orm';
import {
  accounts,
  auditLog,
  journalEntries,
  journalLines,
  withTenantTransaction,
  type AppTransaction,
  type DataClient
} from '@new/data';
import { assertPermission, type RequestContext } from '@new/shared';
import type { JournalDraft } from './types.js';
import { validateJournal } from './validate-journal.js';

export interface PostedJournal {
  id: string;
  status: 'posted';
  totalMinor: bigint;
  reversesJournalId: string | null;
}

export interface JournalService {
  postJournal(ctx: RequestContext, draft: JournalDraft): Promise<PostedJournal>;
  reverseJournal(ctx: RequestContext, journalId: string, reason: string): Promise<PostedJournal>;
}

async function assertJournalAccounts(
  tx: AppTransaction,
  tenantId: string,
  accountIds: readonly string[],
  requireActive: boolean
): Promise<void> {
  const uniqueIds = [...new Set(accountIds)];
  const rows = await tx.select({
    id: accounts.id,
    isActive: accounts.isActive
  }).from(accounts).where(and(
    eq(accounts.tenantId, tenantId),
    inArray(accounts.id, uniqueIds)
  ));

  if (rows.length !== uniqueIds.length) throw new Error('account_not_found');
  if (requireActive && rows.some((row) => !row.isActive)) throw new Error('account_inactive');
}

async function postWithinTransaction(
  tx: AppTransaction,
  ctx: RequestContext,
  draft: JournalDraft,
  options: { reversesJournalId?: string; requireActive: boolean; auditAction: string }
): Promise<PostedJournal> {
  const validation = validateJournal(draft);
  if (!validation.ok) throw new Error(`journal_invalid:${validation.errors.join(',')}`);

  await assertJournalAccounts(tx, ctx.tenantId, draft.lines.map((line) => line.accountId), options.requireActive);

  const [entry] = await tx.insert(journalEntries).values({
    tenantId: ctx.tenantId,
    currency: draft.currency.trim().toUpperCase(),
    memo: draft.memo.trim(),
    reference: draft.reference.trim(),
    status: 'posted',
    totalMinor: validation.totalMinor,
    reversesJournalId: options.reversesJournalId ?? null,
    postedBy: ctx.userId,
    correlationId: ctx.correlationId
  }).returning({
    id: journalEntries.id,
    status: journalEntries.status,
    totalMinor: journalEntries.totalMinor,
    reversesJournalId: journalEntries.reversesJournalId
  });

  if (!entry) throw new Error('journal_post_failed');

  await tx.insert(journalLines).values(draft.lines.map((line) => ({
    tenantId: ctx.tenantId,
    journalId: entry.id,
    accountId: line.accountId,
    debitMinor: line.debitMinor,
    creditMinor: line.creditMinor
  })));

  await tx.insert(auditLog).values({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: options.auditAction,
    resourceType: 'journal_entry',
    resourceId: entry.id,
    correlationId: ctx.correlationId,
    metadata: {
      reference: draft.reference.trim(),
      currency: draft.currency.trim().toUpperCase(),
      totalMinor: validation.totalMinor.toString(),
      reversesJournalId: options.reversesJournalId ?? null
    }
  });

  return {
    id: entry.id,
    status: 'posted',
    totalMinor: entry.totalMinor,
    reversesJournalId: entry.reversesJournalId
  };
}

export function createJournalService(data: DataClient): JournalService {
  return {
    async postJournal(ctx, draft) {
      assertPermission(ctx, 'accounting.post');
      return withTenantTransaction(data.tenantRunner, ctx, (tx) => postWithinTransaction(tx, ctx, draft, {
        requireActive: true,
        auditAction: 'accounting.journal.posted'
      }));
    },

    async reverseJournal(ctx, journalId, reason) {
      assertPermission(ctx, 'accounting.reverse');
      const reversalReason = reason.trim();
      if (!reversalReason) throw new Error('reversal_reason_required');

      return withTenantTransaction(data.tenantRunner, ctx, async (tx) => {
        const [original] = await tx.select({
          id: journalEntries.id,
          currency: journalEntries.currency,
          memo: journalEntries.memo,
          reference: journalEntries.reference
        }).from(journalEntries).where(and(
          eq(journalEntries.tenantId, ctx.tenantId),
          eq(journalEntries.id, journalId)
        )).limit(1);

        if (!original) throw new Error('journal_not_found');

        const [existingReversal] = await tx.select({ id: journalEntries.id })
          .from(journalEntries)
          .where(and(
            eq(journalEntries.tenantId, ctx.tenantId),
            eq(journalEntries.reversesJournalId, original.id)
          ))
          .limit(1);
        if (existingReversal) throw new Error('journal_already_reversed');

        const originalLines = await tx.select({
          accountId: journalLines.accountId,
          debitMinor: journalLines.debitMinor,
          creditMinor: journalLines.creditMinor
        }).from(journalLines).where(and(
          eq(journalLines.tenantId, ctx.tenantId),
          eq(journalLines.journalId, original.id)
        ));

        if (originalLines.length < 2) throw new Error('journal_lines_missing');

        return postWithinTransaction(tx, ctx, {
          currency: original.currency,
          memo: `عكس: ${original.memo} — ${reversalReason}`,
          reference: `REV-${original.reference}`,
          lines: originalLines.map((line) => ({
            accountId: line.accountId,
            debitMinor: line.creditMinor,
            creditMinor: line.debitMinor
          }))
        }, {
          reversesJournalId: original.id,
          requireActive: false,
          auditAction: 'accounting.journal.reversed'
        });
      });
    }
  };
}
