import { and, eq, sql } from 'drizzle-orm';
import {
  auditLog,
  receivableInvoices,
  receivableReceipts,
  withTenantTransaction,
  type AppTransaction,
  type DataClient
} from '@new/data';
import { assertPermission, type RequestContext } from '@new/shared';
import { postJournalWithinTransaction } from '../journals/journal-service.js';

export interface RecordReceivableReceiptInput {
  invoiceId: string;
  cashAccountId: string;
  amountMinor: bigint;
  reference: string;
}

export interface ReceivableReceipt {
  id: string;
  invoiceId: string;
  reference: string;
  currency: string;
  amountMinor: bigint;
  journalId: string;
}

export interface ReceivableInvoiceBalance {
  invoiceId: string;
  originalAmountMinor: bigint;
  paidAmountMinor: bigint;
  outstandingAmountMinor: bigint;
  status: 'unpaid' | 'partially_paid' | 'paid';
}

export interface ReceivableReceiptService {
  recordReceipt(ctx: RequestContext, input: RecordReceivableReceiptInput): Promise<ReceivableReceipt>;
  getInvoiceBalance(ctx: RequestContext, invoiceId: string): Promise<ReceivableInvoiceBalance>;
}

async function loadInvoice(
  tx: AppTransaction,
  tenantId: string,
  invoiceId: string
) {
  const [invoice] = await tx.select({
    id: receivableInvoices.id,
    invoiceNumber: receivableInvoices.invoiceNumber,
    currency: receivableInvoices.currency,
    amountMinor: receivableInvoices.amountMinor,
    receivableAccountId: receivableInvoices.receivableAccountId
  }).from(receivableInvoices).where(and(
    eq(receivableInvoices.tenantId, tenantId),
    eq(receivableInvoices.id, invoiceId)
  )).limit(1);

  if (!invoice) throw new Error('invoice_not_found');
  return invoice;
}

async function calculateInvoiceBalance(
  tx: AppTransaction,
  tenantId: string,
  invoiceId: string
): Promise<ReceivableInvoiceBalance> {
  const invoice = await loadInvoice(tx, tenantId, invoiceId);
  const [aggregate] = await tx.select({
    paidAmountMinor: sql<string>`coalesce(sum(${receivableReceipts.amountMinor}), 0)::text`
  }).from(receivableReceipts).where(and(
    eq(receivableReceipts.tenantId, tenantId),
    eq(receivableReceipts.invoiceId, invoiceId)
  ));

  const paidAmountMinor = BigInt(aggregate?.paidAmountMinor ?? '0');
  const outstandingAmountMinor = invoice.amountMinor - paidAmountMinor;
  if (outstandingAmountMinor < 0n) throw new Error('receivable_overpaid_invariant');

  return {
    invoiceId: invoice.id,
    originalAmountMinor: invoice.amountMinor,
    paidAmountMinor,
    outstandingAmountMinor,
    status: paidAmountMinor === 0n
      ? 'unpaid'
      : outstandingAmountMinor === 0n
        ? 'paid'
        : 'partially_paid'
  };
}

export function createReceivableReceiptService(data: DataClient): ReceivableReceiptService {
  return {
    async recordReceipt(ctx, input) {
      assertPermission(ctx, 'receivables.receipt.record');

      const reference = input.reference.trim();
      if (!reference) throw new Error('receipt_reference_required');
      if (input.amountMinor <= 0n) throw new Error('receipt_amount_must_be_positive');

      return withTenantTransaction(data.tenantRunner, ctx, async (tx) => {
        await tx.execute(sql`
          select id
          from receivable_invoices
          where tenant_id = ${ctx.tenantId}
            and id = ${input.invoiceId}
          for update
        `);

        const invoice = await loadInvoice(tx, ctx.tenantId, input.invoiceId);
        if (input.cashAccountId === invoice.receivableAccountId) {
          throw new Error('receipt_cash_account_must_differ');
        }

        const balance = await calculateInvoiceBalance(tx, ctx.tenantId, invoice.id);
        if (balance.outstandingAmountMinor === 0n) throw new Error('invoice_paid');
        if (input.amountMinor > balance.outstandingAmountMinor) throw new Error('receipt_overpayment');

        const journal = await postJournalWithinTransaction(tx, ctx, {
          currency: invoice.currency,
          memo: `تحصيل ${reference} — ${invoice.invoiceNumber}`,
          reference,
          lines: [
            {
              accountId: input.cashAccountId,
              debitMinor: input.amountMinor,
              creditMinor: 0n
            },
            {
              accountId: invoice.receivableAccountId,
              debitMinor: 0n,
              creditMinor: input.amountMinor
            }
          ]
        }, {
          requireActive: true,
          auditAction: 'receivables.receipt.journal_posted'
        });

        const [receipt] = await tx.insert(receivableReceipts).values({
          tenantId: ctx.tenantId,
          invoiceId: invoice.id,
          reference,
          currency: invoice.currency,
          amountMinor: input.amountMinor,
          cashAccountId: input.cashAccountId,
          journalId: journal.id,
          receivedBy: ctx.userId,
          correlationId: ctx.correlationId
        }).returning({
          id: receivableReceipts.id,
          invoiceId: receivableReceipts.invoiceId,
          reference: receivableReceipts.reference,
          currency: receivableReceipts.currency,
          amountMinor: receivableReceipts.amountMinor,
          journalId: receivableReceipts.journalId
        });

        if (!receipt) throw new Error('receipt_record_failed');

        await tx.insert(auditLog).values({
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          action: 'receivables.receipt.recorded',
          resourceType: 'receivable_receipt',
          resourceId: receipt.id,
          correlationId: ctx.correlationId,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            reference,
            currency: invoice.currency,
            amountMinor: input.amountMinor.toString(),
            journalId: journal.id,
            priorOutstandingAmountMinor: balance.outstandingAmountMinor.toString(),
            newOutstandingAmountMinor: (balance.outstandingAmountMinor - input.amountMinor).toString()
          }
        });

        return receipt;
      });
    },

    async getInvoiceBalance(ctx, invoiceId) {
      assertPermission(ctx, 'receivables.read');
      return withTenantTransaction(data.tenantRunner, ctx, (tx) =>
        calculateInvoiceBalance(tx, ctx.tenantId, invoiceId));
    }
  };
}
