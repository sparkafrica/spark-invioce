import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import {
	banks,
	businesses,
	clients,
	comments,
	companies,
	invoiceItems,
	invoices,
	invoiceTranches,
	payments,
} from '#/db/schema';

export const getInvoiceDetail = createServerFn({ method: 'GET' })
	.validator(
		z.object({
			id: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<{ invoice: any }> => {
		const { id } = data;
		const orgId = process.env.ORGANIZATION_ID!;

		// Fetch invoice with all relations (org scoped)
		const invoiceResult = await db
			.select({
				id: invoices.id,
				number: invoices.number,
				organizationId: invoices.organizationId,
				clientId: invoices.clientId,
				businessId: invoices.businessId,
				companyId: invoices.companyId,
				issueDate: invoices.issueDate,
				dueDate: invoices.dueDate,
				currency: invoices.currency,
				taxName: invoices.taxName,
				taxRate: invoices.taxRate,
				description: invoices.description,
				memo: invoices.memo,
				bankId: invoices.bankId,
				paymentType: invoices.paymentType,
				paymentMethod: invoices.paymentMethod,
				payLink: invoices.payLink,
				payLinkLabel: invoices.payLinkLabel,
				status: invoices.status,
				voided: invoices.voided,
				voidedAt: invoices.voidedAt,
				voidReason: invoices.voidReason,
				createdAt: invoices.createdAt,
				updatedAt: invoices.updatedAt,
			})
			.from(invoices)
			.where(and(eq(invoices.id, id), eq(invoices.organizationId, orgId)))
			.limit(1);

		if (invoiceResult.length === 0) {
			return { invoice: null };
		}

		const invoice = invoiceResult[0];

		// Fetch related data in parallel
		const [
			clientResult,
			businessResult,
			companyResult,
			bankResult,
			itemsResult,
			tranchesResult,
			paymentsResult,
			commentsResult,
		] = await Promise.all([
			db
				.select({
					id: clients.id,
					name: clients.name,
					reg: clients.reg,
					address: clients.address,
					email: clients.email,
					contact: clients.contact,
					notes: clients.notes,
				})
				.from(clients)
				.where(eq(clients.id, invoice.clientId))
				.limit(1),

			db
				.select({
					id: businesses.id,
					name: businesses.name,
					prefix: businesses.prefix,
					logo: businesses.logo,
				})
				.from(businesses)
				.where(eq(businesses.id, invoice.businessId))
				.limit(1),

			db
				.select({
					id: companies.id,
					name: companies.name,
					reg: companies.reg,
					address: companies.address,
					email: companies.email,
					phone: companies.phone,
					tin: companies.tin,
					defaultCurrency: companies.defaultCurrency,
				})
				.from(companies)
				.where(eq(companies.id, invoice.companyId))
				.limit(1),

			db
				.select({
					id: banks.id,
					label: banks.label,
					fields: banks.fields,
				})
				.from(banks)
				.where(eq(banks.id, invoice.bankId!))
				.limit(1),

			db
				.select({
					id: invoiceItems.id,
					name: invoiceItems.name,
					description: invoiceItems.description,
					qty: invoiceItems.qty,
					cost: invoiceItems.cost,
					discountName: invoiceItems.discountName,
					discountPct: invoiceItems.discountPct,
					discountAmt: invoiceItems.discountAmt,
					sortOrder: invoiceItems.sortOrder,
				})
				.from(invoiceItems)
				.where(eq(invoiceItems.invoiceId, invoice.id))
				.orderBy(invoiceItems.sortOrder),

			db
				.select({
					id: invoiceTranches.id,
					name: invoiceTranches.name,
					deliverables: invoiceTranches.deliverables,
					dueDate: invoiceTranches.dueDate,
					amount: invoiceTranches.amount,
					paid: invoiceTranches.paid,
					paidAt: invoiceTranches.paidAt,
					sortOrder: invoiceTranches.sortOrder,
				})
				.from(invoiceTranches)
				.where(eq(invoiceTranches.invoiceId, invoice.id))
				.orderBy(invoiceTranches.sortOrder),

			db
				.select({
					id: payments.id,
					amount: payments.amount,
					note: payments.note,
					recordedBy: payments.recordedBy,
					recordedAt: payments.recordedAt,
				})
				.from(payments)
				.where(eq(payments.invoiceId, invoice.id))
				.orderBy(desc(payments.recordedAt)),

			db
				.select({
					id: comments.id,
					userId: comments.userId,
					text: comments.text,
					createdAt: comments.createdAt,
				})
				.from(comments)
				.where(eq(comments.invoiceId, invoice.id))
				.orderBy(comments.createdAt),
		]);

		const client = clientResult[0];
		const business = businessResult[0];
		const company = companyResult[0];
		const bank = bankResult[0];

		// Calculate totals
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

		// Calculate tax and total
		const taxRateVal = Number(invoice.taxRate || 0);
		const taxAmountVal = subtotal * (taxRateVal / 100);
		const totalVal = subtotal + taxAmountVal;

		// Build response
		const invoiceDetail = {
			id: invoice.id,
			number: invoice.number,
			clientId: client?.id || '',
			clientName: client?.name || '',
			clientReg: client?.reg || null,
			clientAddress: client?.address || null,
			clientEmail: client?.email || null,
			clientContact: client?.contact || null,
			clientNotes: client?.notes || null,
			businessId: business?.id || '',
			businessName: business?.name || '',
			businessPrefix: business?.prefix || '',
			companyId: company?.id || '',
			companyName: company?.name || '',
			companyReg: company?.reg || null,
			companyAddress: company?.address || null,
			companyEmail: company?.email || null,
			companyPhone: company?.phone || null,
			companyTin: company?.tin || null,
			companyDefaultCurrency: company?.defaultCurrency || 'NGN',
			issueDate: invoice.issueDate
				? new Date(invoice.issueDate).toLocaleDateString()
				: '',
			dueDate: invoice.dueDate
				? new Date(invoice.dueDate).toLocaleDateString()
				: '',
			currency: invoice.currency,
			taxName: invoice.taxName || 'VAT',
			taxRate: invoice.taxRate || '7.50',
			description: invoice.description,
			memo: invoice.memo,
			bankId: bank?.id || null,
			bankLabel: bank?.label || null,
			bankFields: bank?.fields || [],
			paymentType: invoice.paymentType,
			paymentMethod: invoice.paymentMethod,
			payLink: invoice.payLink,
			payLinkLabel: invoice.payLinkLabel,
			status: invoice.status,
			voided: invoice.voided,
			voidedAt: invoice.voidedAt
				? new Date(invoice.voidedAt).toLocaleDateString()
				: null,
			voidReason: invoice.voidReason,
			createdAt: new Date(invoice.createdAt).toLocaleDateString(),
			updatedAt: new Date(invoice.updatedAt).toLocaleDateString(),
			items: itemsResult.map((item) => ({
				id: item.id,
				name: item.name,
				description: item.description,
				qty: item.qty,
				cost: item.cost,
				discountName: item.discountName,
				discountPct: item.discountPct ?? '0',
				discountAmt: item.discountAmt ?? '0',
				sortOrder: item.sortOrder,
			})),
			tranches: tranchesResult.map((t) => ({
				id: t.id,
				name: t.name,
				deliverables: t.deliverables,
				dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : null,
				amount: t.amount,
				paid: t.paid,
				paidAt: t.paidAt ? new Date(t.paidAt).toLocaleDateString() : null,
				sortOrder: t.sortOrder,
			})),
			payments: paymentsResult.map((p) => ({
				id: p.id,
				amount: p.amount,
				note: p.note,
				recordedBy: p.recordedBy,
				recordedAt: new Date(p.recordedAt).toLocaleDateString(),
			})),
			comments: commentsResult.map((c: any) => ({
				id: c.id,
				userId: c.userId,
				text: c.text,
				createdAt: new Date(c.createdAt).toLocaleDateString(),
			})),
			subtotal,
			taxAmount: taxAmountVal,
			total: totalVal,
		};

		return {
			invoice: invoiceDetail,
		};
	});
