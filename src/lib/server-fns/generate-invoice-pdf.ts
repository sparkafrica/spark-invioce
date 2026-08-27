import { createServerFn } from '@tanstack/react-start';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import {
	banks,
	businesses,
	clients,
	companies,
	invoiceItems,
	invoices,
	invoiceTranches,
	payments,
} from '#/db/schema';

interface GeneratePDFResponse {
	pdf: Array<number>;
	filename: string;
}

export const generateInvoicePDF = createServerFn({ method: 'GET' })
	.validator(
		z.object({
			invoiceId: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<GeneratePDFResponse> => {
		const { invoiceId } = data;

		// Fetch invoice with all relations
		const invoiceResult = await db
			.select({
				id: invoices.id,
				number: invoices.number,
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
			.where(eq(invoices.id, invoiceId))
			.limit(1);

		if (invoiceResult.length === 0) {
			throw new Error('Invoice not found');
		}

		const invoice = invoiceResult[0];

		// Fetch all related data in parallel
		const [
			clientResult,
			businessResult,
			companyResult,
			bankResult,
			itemsResult,
			tranchesResult,
			paymentsResult,
		] = await Promise.all([
			db
				.select({
					id: clients.id,
					name: clients.name,
					email: clients.email,
					contact: clients.contact,
					address: clients.address,
					reg: clients.reg,
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
					address: companies.address,
					email: companies.email,
					phone: companies.phone,
					tin: companies.tin,
					reg: companies.reg,
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

		const taxRate = Number(invoice.taxRate || 0);
		const taxAmount = subtotal * (taxRate / 100);
		const total = subtotal + taxAmount;

		// Build PDF data
		const pdfData = {
			invoice: {
				number: invoice.number,
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
				paymentType: invoice.paymentType,
				paymentMethod: invoice.paymentMethod,
				payLink: invoice.payLink,
				payLinkLabel: invoice.payLinkLabel,
				status: invoice.status,
			},
			client: {
				name: client?.name || '',
				email: client?.email || null,
				contact: client?.contact || null,
				address: client?.address || null,
				reg: client?.reg || null,
			},
			company: {
				name: company?.name || '',
				address: company?.address || null,
				email: company?.email || null,
				phone: company?.phone || null,
				tin: company?.tin || null,
				reg: company?.reg || null,
			},
			business: {
				name: business?.name || '',
				prefix: business?.prefix || '',
				logo: business?.logo || null,
			},
			bank: bank
				? {
						label: bank.label,
						fields: bank.fields || [],
					}
				: null,
			items: itemsResult.map((item) => ({
				name: item.name,
				description: item.description,
				qty: item.qty,
				cost: item.cost,
				discountName: item.discountName,
				discountPct: item.discountPct ?? '0',
				discountAmt: item.discountAmt ?? '0',
			})),
			tranches: tranchesResult.map((t) => ({
				name: t.name,
				deliverables: t.deliverables,
				dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : null,
				amount: t.amount,
				paid: t.paid,
			})),
			payments: paymentsResult.map((p) => ({
				amount: p.amount,
				note: p.note,
				recordedBy: p.recordedBy,
				recordedAt: new Date(p.recordedAt).toLocaleDateString(),
			})),
			subtotal,
			taxAmount,
			total,
		};

		// Generate PDF using React-PDF
		// 	const stream = await renderToStream(
		// 		React.createElement(
		// 			Document,
		// 			{},
		// 			React.createElement(InvoicePDF, { data: pdfData }),
		// 		),
		// 	);

		// 	const chunks: Buffer[] = [];
		// 	for await (const chunk of stream) {
		// 		chunks.push(Buffer.from(chunk));
		// 	}

		// 	const pdfBuffer = Buffer.concat(chunks);
		// 	const pdfArray = Array.from(new Uint8Array(pdfBuffer));

		// 	return {
		// 		pdf: pdfArray,
		// 		filename: `${invoice.number}.pdf`,
		// 	};
		// });

		const [React, { Document, renderToStream }, { InvoicePDF }] = await Promise.all([
			import('react'),
			import('@react-pdf/renderer'),
			import('#/components/invoice/InvoicePDF'),
		]);

		// Generate PDF using React-PDF
		const stream = await renderToStream(
			React.createElement(
				Document,
				{},
				React.createElement(InvoicePDF, { data: pdfData }),
			),
		);

		// 1. Collect chunks into an array of Uint8Arrays (Universal Web API)
		const chunks: Uint8Array[] = [];
		for await (const chunk of stream) {
			if (typeof chunk === 'string') {
				// Fallback if the stream ever emits raw text
				chunks.push(new TextEncoder().encode(chunk));
			} else {
				// Safely cast the Node Buffer to any/Uint8Array for the constructor
				chunks.push(new Uint8Array(chunk));
			}
		}

		// 2. Calculate the total size of all chunks combined
		const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
		const pdfUint8Array = new Uint8Array(totalLength);

		// 3. Merge chunks together
		let offset = 0;
		for (const chunk of chunks) {
			pdfUint8Array.set(chunk, offset);
			offset += chunk.length;
		}

		// 4. Safely convert to a plain Array for serialization
		const pdfArray = Array.from(pdfUint8Array);

		return {
			pdf: pdfArray,
			filename: `${invoice.number}.pdf`,
		};
	});
