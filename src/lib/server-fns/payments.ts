import { createId } from '@paralleldrive/cuid2';
import { createServerFn } from '@tanstack/react-start';
import { desc, eq, sum } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { invoiceItems, invoices, invoiceTranches, payments } from '#/db/schema';

const recordPaymentSchema = z.object({
	invoiceId: z.string().min(1),
	amount: z.string().regex(/^\d+(\.\d+)?$/),
	note: z.string().optional().nullable(),
});

export const recordPayment = createServerFn({ method: 'POST' })
	.validator(recordPaymentSchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string; name: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const userName = ctx.session.user.name;

		// Get invoice details
		const invoiceResult = await db
			.select({
				id: invoices.id,
				number: invoices.number,
				total: invoices.taxRate, // We'll calculate total from items
				status: invoices.status,
				currency: invoices.currency,
				taxRate: invoices.taxRate,
				paymentType: invoices.paymentType,
			})
			.from(invoices)
			.where(eq(invoices.id, data.invoiceId))
			.limit(1);

		if (!invoiceResult[0]) {
			throw new Error('Invoice not found');
		}

		const invoice = invoiceResult[0];

		// Calculate invoice total from items
		const itemsResult = await db
			.select({
				qty: invoiceItems.qty,
				cost: invoiceItems.cost,
				discountPct: invoiceItems.discountPct,
				discountAmt: invoiceItems.discountAmt,
			})
			.from(invoiceItems)
			.where(eq(invoiceItems.invoiceId, invoice.id));

		let subtotal = 0;
		for (const item of itemsResult) {
			const qty = Number(item.qty);
			const cost = Number(item.cost);
			const discountAmt = Number(item.discountAmt || 0);
			const discountPct = Number(item.discountPct || 0);
			const lineTotal = qty * cost;
			const discountAmount = discountAmt + (lineTotal * discountPct) / 100;
			subtotal += lineTotal - discountAmount;
		}

		const taxRate = Number(invoice.taxRate || 0);
		const taxAmount = subtotal * (taxRate / 100);
		const total = subtotal + taxAmount;

		// Get existing payments total
		const existingPayments = await db
			.select({ total: sum(payments.amount) })
			.from(payments)
			.where(eq(payments.invoiceId, invoice.id));

		const paidTotal = Number(existingPayments[0]?.total || 0);
		const newPaymentAmount = Number(data.amount);
		const newPaidTotal = paidTotal + newPaymentAmount;

		// Determine new status
		let newStatus = invoice.status;
		if (newPaidTotal >= total) {
			newStatus = 'paid';
		} else if (newPaidTotal > 0) {
			newStatus = 'part_paid';
		}

		// Record payment
		const paymentId = createId();
		await db.insert(payments).values({
			id: paymentId,
			invoiceId: data.invoiceId,
			amount: data.amount,
			note: data.note,
			recordedBy: userName,
			recordedAt: new Date(),
		});

		// Update invoice status
		await db
			.update(invoices)
			.set({
				status: newStatus as any,
				updatedAt: new Date(),
			})
			.where(eq(invoices.id, data.invoiceId));

		// If tranche payment type, also check tranches
		if (invoice.paymentType === 'tranche') {
			const tranchesResult = await db
				.select({
					id: invoiceTranches.id,
					amount: invoiceTranches.amount,
					paid: invoiceTranches.paid,
				})
				.from(invoiceTranches)
				.where(eq(invoiceTranches.invoiceId, invoice.id));

			let tranchePaidTotal = 0;
			for (const tranche of tranchesResult) {
				if (tranche.paid) {
					tranchePaidTotal += Number(tranche.amount);
				}
			}

			// Check if all tranches are paid
			const allTranchesPaid = tranchesResult.every((t) => t.paid);
			if (allTranchesPaid && newStatus !== 'paid') {
				await db
					.update(invoices)
					.set({
						status: 'paid' as any,
						updatedAt: new Date(),
					})
					.where(eq(invoices.id, data.invoiceId));
			}
		}

		return {
			paymentId,
			newStatus,
			paidTotal: newPaidTotal,
			total,
			remaining: total - newPaidTotal,
		};
	});

export const getInvoicePayments = createServerFn({ method: 'GET' })
	.validator(z.object({ invoiceId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const paymentsResult = await db
			.select({
				id: payments.id,
				amount: payments.amount,
				note: payments.note,
				recordedBy: payments.recordedBy,
				recordedAt: payments.recordedAt,
			})
			.from(payments)
			.where(eq(payments.invoiceId, data.invoiceId))
			.orderBy(desc(payments.recordedAt));

		return { payments: paymentsResult };
	});
