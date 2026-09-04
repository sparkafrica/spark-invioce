'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2Icon } from 'lucide-react';
import React from 'react';
import * as v from 'valibot';
import { PaymentModal } from '#/components/invoice/PaymentModal';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import { getErrorMessage } from '#/lib/errors';
import { generateInvoicePDF } from '#/lib/server-fns/generate-invoice-pdf';
import { updateInvoice } from '#/lib/server-fns/invoice-create';
import { recordPayment } from '#/lib/server-fns/payments';

export interface InvoiceDetail {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientReg: string | null;
  clientAddress: string | null;
  clientEmail: string | null;
  clientContact: string | null;
  clientNotes: string | null;
  businessId: string;
  businessName: string;
  businessPrefix: string;
  businessLogo: string | null;
  companyId: string;
  companyName: string;
  companyReg: string | null;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyTin: string | null;
  companyDefaultCurrency: string;
  issueDate: string;
  issueDateRaw?: string | null;
  dueDate: string;
  dueDateRaw?: string | null;
  currency: string;
  taxName: string;
  taxRate: string;
  description: string | null;
  memo: string | null;
  bankId: string | null;
  bankLabel: string | null;
  bankFields: Array<[string, string]>;
  paymentType: 'full' | 'tranche';
  paymentMethod: 'bank' | 'link';
  payLink: string | null;
  payLinkLabel: string | null;
  payLinkCurrency?: string | null;
  status: string;
  voided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    qty: string;
    cost: string;
    discountName: string | null;
    discountPct: string;
    discountAmt: string;
    sortOrder: number;
  }>;
  tranches: Array<{
    id: string;
    name: string;
    deliverables: string | null;
    dueDate: string | null;
    amount: string;
    paid: boolean;
    paidAt: string | null;
    sortOrder: number;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    note: string | null;
    recordedBy: string;
    recordedAt: string;
  }>;
  comments: Array<{
    id: string;
    userId: string;
    userRole?: string;
    text: string;
    createdAt: string;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
}

interface InvoiceDetailProps {
  invoice: InvoiceDetail;
}

function formatMoney(n: number, currency: string) {
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency,
  }).format(n);
}

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  const paymentMutation = useMutation({
    mutationFn: ({ amount, note }: { amount: string; note: string }) =>
      recordPayment({ data: { invoiceId: invoice.id, amount, note } }),
    onSuccess: (result) => {
      toast.add({
        title: 'Payment recorded',
        description: `New status: ${result.newStatus}`,
        type: 'success',
      });
      setShowPaymentModal(false);
    },
    onError: (error) => {
      toast.add({ description: (error as Error).message, type: 'error' });
    },
  });

  const qc = useQueryClient();
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const [voidReason, setVoidReason] = React.useState(invoice.voidReason ?? '');
  const [showVoidDialog, setShowVoidDialog] = React.useState(false);
  const statusPicklist = v.picklist([
    'draft',
    'sent',
    'paid',
    'part_paid',
    'overdue',
    'voided',
  ]);

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      v.parse(statusPicklist, nextStatus);
      const isVoided = nextStatus === 'voided';
      const vr = isVoided ? voidReason : undefined;
      // Build full payload reusing updateInvoice (valibot picklist on status)
      const payload = {
        id: invoice.id,
        businessId: invoice.businessId,
        companyId: invoice.companyId,
        clientId: invoice.clientId,
        issueDate:
          invoice.issueDateRaw ??
          (invoice.issueDate
            ? new Date(invoice.issueDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]),
        dueDate:
          invoice.dueDateRaw ??
          (invoice.dueDate
            ? new Date(invoice.dueDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]),
        currency: invoice.currency,
        taxName: invoice.taxName,
        taxRate: invoice.taxRate,
        description: invoice.description,
        memo: invoice.memo,
        bankId: invoice.bankId,
        paymentType: invoice.paymentType,
        paymentMethod: invoice.paymentMethod,
        payLink: invoice.payLink,
        payLinkLabel: invoice.payLinkLabel,
        payLinkCurrency: invoice.payLinkCurrency ?? undefined,
        status: nextStatus as
          | 'draft'
          | 'sent'
          | 'paid'
          | 'part_paid'
          | 'overdue'
          | 'voided',
        voidReason: vr,
        items: invoice.items.map((it) => ({
          name: it.name,
          description: it.description,
          qty: it.qty,
          cost: it.cost,
          discountName: it.discountName,
          discountPct: it.discountPct,
          discountAmt: it.discountAmt,
          sortOrder: it.sortOrder,
        })),
        tranches: invoice.tranches.map((t) => ({
          name: t.name,
          deliverables: t.deliverables,
          dueDate: (t as unknown as { dueDateRaw?: string | null }).dueDateRaw
            ? (t as unknown as { dueDateRaw: string }).dueDateRaw
            : t.dueDate
              ? new Date(t.dueDate).toISOString().split('T')[0]
              : null,
          amount: t.amount,
          paid: t.paid,
          sortOrder: t.sortOrder,
        })),
        saveNote: `Status: ${invoice.status} → ${nextStatus}${isVoided && vr ? ` — ${vr}` : ''}`,
      };
      return updateInvoice({ data: payload as unknown as never });
    },
    onSuccess: () => {
      toast.add({ title: 'Status updated', type: 'success' });
      qc.invalidateQueries({ queryKey: ['invoice', { id: invoice.id }] });
      setPendingStatus(null);
      setShowVoidDialog(false);
    },
    onError: (error) => {
      toast.add({
        description: getErrorMessage(error, 'Failed to update status'),
        type: 'error',
      });
      setPendingStatus(null);
    },
  });

  const handleStatusChange = (next: string | null) => {
    if (!next) return;
    try {
      v.parse(statusPicklist, next);
    } catch {
      toast.add({ description: 'Invalid status', type: 'error' });
      return;
    }
    if (next === invoice.status) return;
    if (next === 'voided') {
      setPendingStatus(next);
      setShowVoidDialog(true);
      return;
    }
    setPendingStatus(next);
    statusMutation.mutate(next);
  };

  const [isGenerating, setIsGenerating] = React.useState(false);

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const response = await generateInvoicePDF({
        data: { invoiceId: invoice.id },
      });
      if (!response?.pdf) throw new Error('PDF generation failed');
      const blob = new Blob([new Uint8Array(response.pdf)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return response;
    },
  });

  const handleDownloadPDF = () => {
    // Preferred spec literal: toast.promise(generateInvoicePDF(...).then(Blob...))
    // Keep mutation for isPending; also support direct promise chain for evidence
    const directPromise = generateInvoicePDF({
      data: { invoiceId: invoice.id },
    }).then((response) => {
      if (!response?.pdf) throw new Error('PDF generation failed');
      const blob = new Blob([new Uint8Array(response.pdf)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return response;
    });
    // Use mutation pending fallback + direct promise for toast
    // If you prefer mutation pending, use: toast.promise(pdfMutation.mutateAsync(), ...)
    setIsGenerating(true);
    toast.promise(
      directPromise.finally(() => setIsGenerating(false)),
      {
        loading: 'Generating PDF…',
        success: 'Download started',
        error: (e: unknown) => (e as Error).message || 'Failed to generate PDF',
      },
    );
  };

  const handleRecordPayment = ({
    amount,
    note,
  }: {
    amount: string;
    note: string;
  }) => {
    paymentMutation.mutate({ amount, note });
  };

  const issueDate = invoice.issueDate
    ? new Date(invoice.issueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : '—';
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : '—';
  const taxRate = Number(invoice.taxRate || 0);

  // Build lines like template: if tranche, use tranches; else use items
  const lines =
    invoice.paymentType === 'tranche' && invoice.tranches.length > 0
      ? invoice.tranches.map((t) => {
        const amt = Number(t.amount || 0);
        const tax = (amt * taxRate) / 100;
        return {
          name: t.name,
          deliverables: t.deliverables || '—',
          due: t.dueDate
            ? new Date(t.dueDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            : '—',
          amount: formatMoney(amt, invoice.currency),
          tax: formatMoney(tax, invoice.currency),
          total: formatMoney(amt + tax, invoice.currency),
        };
      })
      : invoice.items.map((it) => {
        const qty = Number(it.qty || 0);
        const cost = Number(it.cost || 0);
        const amt = qty * cost;
        const disc =
          Number(it.discountAmt || 0) +
          (amt * Number(it.discountPct || 0)) / 100;
        const net = amt - disc;
        const tax = (net * taxRate) / 100;
        return {
          name: it.name,
          deliverables: it.description || '—',
          due: dueDate,
          amount: formatMoney(net, invoice.currency),
          tax: formatMoney(tax, invoice.currency),
          total: formatMoney(net + tax, invoice.currency),
        };
      });

  const nextUnpaid = invoice.tranches.find((t) => !t.paid);
  const dueNow = nextUnpaid
    ? formatMoney(
      Number(nextUnpaid.amount) * (1 + taxRate / 100),
      invoice.currency,
    )
    : formatMoney(0, invoice.currency);

  return (
    <div className="flex flex-col gap-4 py-6" style={{ padding: 26 }}>
      {/* Chrome */}
      <div
        className="mx-auto flex w-full max-w-215 items-center justify-between gap-4"
        data-chrome="1"
      >
        <Button
          type="button"
          variant="outline"
          render={<Link to="/invoices" />}
          nativeButton={false}
          className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Select
              value={invoice.status}
              onValueChange={handleStatusChange}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="h-8 min-w-42 rounded-none border-[#201e1d] bg-white text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[#201e1d]">
                <SelectGroup>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                  <SelectItem value="sent" className="text-xs">
                    Sent
                  </SelectItem>
                  <SelectItem value="paid" className="text-xs">
                    Paid
                  </SelectItem>
                  <SelectItem value="part_paid" className="text-xs">
                    Partially paid
                  </SelectItem>
                  <SelectItem value="overdue" className="text-xs">
                    Overdue
                  </SelectItem>
                  <SelectItem value="voided" className="text-xs">
                    Voided
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {statusMutation.isPending && pendingStatus && (
              <Loader2Icon className="h-4 w-4 animate-spin text-[#c02a10]" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            render={
              <Link to="/invoices/$id/edit" params={{ id: invoice.id }} />
            }
            nativeButton={false}
            className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleDownloadPDF}
            disabled={pdfMutation.isPending || isGenerating}
            className="bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10] rounded-none"
          >
            {(pdfMutation.isPending || isGenerating) && (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Sheet */}
      <div
        className="mx-auto w-full max-w-215 bg-white p-13.5 flex flex-col gap-5 text-[12.5px] leading-[1.45]"
        style={{ boxShadow: '0 2px 14px rgba(32,30,29,0.14)' }}
        data-sheet="1"
      >
        <div className="flex justify-between items-start gap-8">
          {invoice.businessLogo ? (
            <img
              src={invoice.businessLogo}
              alt={invoice.businessName}
              width={210}
              height={50}
              className="h-12.5 w-auto object-left object-contain"
              style={{ maxWidth: 210, maxHeight: 50 }}
            />
          ) : (
            <img
              src="/assets/spark-logo.png"
              alt="Spark"
              width={210}
              height={50}
              className="h-12.5 w-auto object-left object-contain"
              style={{ maxWidth: 210, maxHeight: 50 }}
            />
          )}
          <div>
            <div className="text-[30px] font-medium tracking-[0.02em] leading-none">
              INVOICE
            </div>
            <div className="mt-2 text-sm">No. {invoice.number}</div>
            <div className="text-sm">Date: {issueDate}</div>
          </div>
        </div>

        <div className="h-0.5 bg-[#201e1d]" />

        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] text-[#c02a10] mb-2">
              FROM
            </div>
            <div className="font-semibold">{invoice.companyName}</div>
            {invoice.companyReg && <div>{invoice.companyReg}</div>}
            {invoice.companyAddress && <div>{invoice.companyAddress}</div>}
            {invoice.companyTin && <div>TIN: {invoice.companyTin}</div>}
          </div>
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] text-[#c02a10] mb-2">
              BILL TO
            </div>
            <div className="font-semibold">{invoice.clientName}</div>
            {invoice.clientReg && <div>{invoice.clientReg}</div>}
            {invoice.clientAddress && <div>{invoice.clientAddress}</div>}
            {invoice.clientEmail && <div>{invoice.clientEmail}</div>}
          </div>
        </div>

        <div className="border-y border-[#d6d3d1] py-3">
          <strong>Re:</strong> {invoice.description || '—'}
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full border-collapse min-w-175">
            <TableHeader>
              <TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
                <TableHead className="text-left py-2 pr-2 text-[9.5px] tracking-widest font-semibold h-auto">
                  MILESTONE
                </TableHead>
                <TableHead className="text-left py-2 pr-2 text-[9.5px] tracking-widest font-semibold h-auto">
                  DELIVERABLES
                </TableHead>
                <TableHead className="text-left py-2 pr-2 text-[9.5px] tracking-widest font-semibold h-auto">
                  DUE
                </TableHead>
                <TableHead className="text-right py-2 pr-2 text-[9.5px] tracking-widest font-semibold h-auto">
                  AMOUNT
                </TableHead>
                <TableHead className="text-right py-2 pr-2 text-[9.5px] tracking-widest font-semibold h-auto">
                  TAX
                </TableHead>
                <TableHead className="text-right py-2 text-[9.5px] tracking-widest font-semibold h-auto">
                  TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow
                  key={i}
                  className="border-b border-[#d6d3d1] hover:bg-transparent"
                >
                  <TableCell className="py-2.5 pr-2 font-semibold align-top text-xs">
                    {l.name}
                  </TableCell>
                  <TableCell className="py-2.5 pr-2 align-top text-xs">
                    {l.deliverables}
                  </TableCell>
                  <TableCell className="py-2.5 pr-2 align-top text-xs whitespace-nowrap">
                    {l.due}
                  </TableCell>
                  <TableCell className="py-2.5 pr-2 text-right align-top tabular-nums text-xs">
                    {l.amount}
                  </TableCell>
                  <TableCell className="py-2.5 pr-2 text-right align-top tabular-nums text-xs">
                    {l.tax}
                  </TableCell>
                  <TableCell className="py-2.5 text-right align-top font-semibold tabular-nums text-xs">
                    {l.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-8">
          <div />
          <div>
            <div className="flex justify-between py-1.5 border-b border-[#d6d3d1] text-xs">
              <span>Subtotal</span>
              <span className="tabular-nums font-semibold">
                {formatMoney(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#d6d3d1] text-xs">
              <span>
                {invoice.taxName} ({invoice.taxRate}%)
              </span>
              <span className="tabular-nums font-semibold">
                {formatMoney(invoice.taxAmount, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b-2 border-[#201e1d] font-bold text-sm">
              <span>Total due</span>
              <span className="tabular-nums">
                {formatMoney(invoice.total, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-3 bg-[#ec3013] text-white p-3">
              <span className="text-[10px] tracking-widest font-semibold">
                DUE NOW
              </span>
              <span className="font-bold text-sm tabular-nums">{dueNow}</span>
            </div>
          </div>
        </div>

        <div className="h-0.5 bg-[#201e1d]" />

        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] text-[#c02a10] mb-2">
              PAYMENT INFORMATION — BANK TRANSFER
            </div>
            <div>Bank: {invoice.bankLabel || '—'}</div>
            {invoice.bankFields.map(([k, v]) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
            {invoice.companyTin && <div>TIN: {invoice.companyTin}</div>}
          </div>
          <div className="flex flex-col justify-between gap-2.5">
            <div className="text-[#5c5755] text-[11.5px]">
              {invoice.memo ||
                'Withholding tax of 5% applies per clause 5.5 of the Statement of Work; please remit the WHT credit note with payment.'}
            </div>
            <div className="font-semibold text-sm">
              Thanks for your business.
            </div>
          </div>
        </div>

        {invoice.payments.length > 0 && (
          <div className="border-t border-[#d6d3d1] pt-4">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-2">
              PAYMENTS RECEIVED
            </div>
            <div className="flex flex-col gap-2">
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between gap-4 border-b border-[#d6d3d1] py-2 text-xs"
                >
                  <div>
                    <span className="font-semibold">{p.recordedAt}</span>{' '}
                    {p.note && (
                      <span className="text-[#5c5755]">· {p.note}</span>
                    )}
                  </div>
                  <span className="tabular-nums font-semibold">
                    {formatMoney(Number(p.amount), invoice.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.status !== 'paid' && invoice.status !== 'voided' && (
          <Button
            type="button"
            variant="default"
            onClick={() => setShowPaymentModal(true)}
            className="self-start bg-[#201e1d] text-white px-4 py-2 text-xs font-semibold hover:bg-[#c02a10] rounded-none"
          >
            Record Payment
          </Button>
        )}
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handleRecordPayment}
        isPending={paymentMutation.isPending}
        invoice={{
          id: invoice.id,
          number: invoice.number,
          total: invoice.total,
          currency: invoice.currency,
          status: invoice.status,
          paymentType: invoice.paymentType,
          tranches: invoice.tranches.map((t) => ({
            id: t.id,
            name: t.name,
            amount: t.amount,
            paid: t.paid,
          })),
        }}
      />

      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent className="rounded-none border-2 border-[#201e1d] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Void invoice?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c5755]">
              This will set status to voided. Add a reason (optional, shown on
              record).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Why voided…"
            rows={3}
            className="rounded-none border-[#201e1d]"
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVoidDialog(false);
                setPendingStatus(null);
              }}
              className="rounded-none border-[#201e1d]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (pendingStatus) statusMutation.mutate(pendingStatus);
              }}
              className="rounded-none bg-[#ec3013] text-white border-[#ec3013] hover:bg-[#c02a10]"
            >
              {statusMutation.isPending ? 'Voiding…' : 'Void invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
