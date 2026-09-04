import {
  auditLog,
  receivableInvoices,
  withTenantTransaction,
  type DataClient
} from '@new/data';
import { assertPermission, type RequestContext } from '@new/shared';
import { postJournalWithinTransaction } from '../journals/journal-service.js';

export interface IssueReceivableInvoiceInput {
  invoiceNumber: string;
  customerName: string;
  currency: string;
  amountMinor: bigint;
  receivableAccountId: string;
  revenueAccountId: string;
}

export interface ReceivableInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  currency: string;
  amountMinor: bigint;
  status: 'issued';
  journalId: string;
}

export interface ReceivableService {
  issueInvoice(ctx: RequestContext, input: IssueReceivableInvoiceInput): Promise<ReceivableInvoice>;
}

export function createReceivableService(data: DataClient): ReceivableService {
  return {
    async issueInvoice(ctx, input) {
      assertPermission(ctx, 'receivables.invoice.issue');

      const invoiceNumber = input.invoiceNumber.trim();
      const customerName = input.customerName.trim();
      const currency = input.currency.trim().toUpperCase();

      if (!invoiceNumber) throw new Error('invoice_number_required');
      if (!customerName) throw new Error('customer_name_required');
      if (!currency) throw new Error('currency_required');
      if (input.amountMinor <= 0n) throw new Error('invoice_amount_must_be_positive');
      if (input.receivableAccountId === input.revenueAccountId) throw new Error('invoice_accounts_must_differ');

      return withTenantTransaction(data.tenantRunner, ctx, async (tx) => {
        const journal = await postJournalWithinTransaction(tx, ctx, {
          currency,
          memo: `فاتورة ${invoiceNumber} — ${customerName}`,
          reference: invoiceNumber,
          lines: [
            {
              accountId: input.receivableAccountId,
              debitMinor: input.amountMinor,
              creditMinor: 0n
            },
            {
              accountId: input.revenueAccountId,
              debitMinor: 0n,
              creditMinor: input.amountMinor
            }
          ]
        }, {
          requireActive: true,
          auditAction: 'receivables.invoice.journal_posted'
        });

        const [invoice] = await tx.insert(receivableInvoices).values({
          tenantId: ctx.tenantId,
          invoiceNumber,
          customerName,
          currency,
          amountMinor: input.amountMinor,
          receivableAccountId: input.receivableAccountId,
          revenueAccountId: input.revenueAccountId,
          journalId: journal.id,
          status: 'issued',
          issuedBy: ctx.userId,
          correlationId: ctx.correlationId
        }).returning({
          id: receivableInvoices.id,
          invoiceNumber: receivableInvoices.invoiceNumber,
          customerName: receivableInvoices.customerName,
          currency: receivableInvoices.currency,
          amountMinor: receivableInvoices.amountMinor,
          status: receivableInvoices.status,
          journalId: receivableInvoices.journalId
        });

        if (!invoice) throw new Error('invoice_issue_failed');

        await tx.insert(auditLog).values({
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          action: 'receivables.invoice.issued',
          resourceType: 'receivable_invoice',
          resourceId: invoice.id,
          correlationId: ctx.correlationId,
          metadata: {
            invoiceNumber,
            customerName,
            currency,
            amountMinor: input.amountMinor.toString(),
            journalId: journal.id
          }
        });

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          currency: invoice.currency,
          amountMinor: invoice.amountMinor,
          status: 'issued',
          journalId: invoice.journalId
        };
      });
    }
  };
}
