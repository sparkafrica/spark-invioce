import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, desc, eq } from 'drizzle-orm';
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
import { auth } from '#/lib/auth';

interface GeneratePDFResponse {
	pdf: Array<number>;
	filename: string;
}

// NOTE: GET limits URL/query size (~2KB typical). Payload here is only { invoiceId }
// so GET is safe; response is serialized Array<number> via JSON. For large binary
// payloads or future POST params, prefer method: 'POST' to avoid URL length limits.
export const generateInvoicePDF = createServerFn({ method: 'GET' })
	.validator(
		z.object({
			invoiceId: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<GeneratePDFResponse> => {
		const { invoiceId } = data;

		// Auth check — require session (mirrors invoice-detail.ts org scoping pattern)
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		if (!orgId) throw new Error('ORGANIZATION_ID not configured');

		// Fetch invoice org-scoped like invoice-detail.ts
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
			.where(
				and(eq(invoices.id, invoiceId), eq(invoices.organizationId, orgId)),
			)
			.limit(1);

		if (invoiceResult.length === 0) {
			throw new Error('Invoice not found');
		}

		const invoice = invoiceResult[0];

		// Fetch all related data in parallel — bankId null guard avoids eq(banks.id, null) crash
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

			invoice.bankId
				? db
						.select({
							id: banks.id,
							label: banks.label,
							fields: banks.fields,
						})
						.from(banks)
						.where(eq(banks.id, invoice.bankId))
						.limit(1)
				: Promise.resolve(
						[] as Array<{
							id: string;
							label: string;
							fields: Array<[string, string]>;
						}>,
					),

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

		// Generate PDF using React-PDF — guarded for font/render failures
		try {
			const [React, { renderToStream }, { InvoicePDF }] = await Promise.all([
				import('react'),
				import('@react-pdf/renderer'),
				import('#/components/invoice/InvoicePDF'),
			]);

			// Generate PDF using React-PDF
			const stream = await renderToStream(
				React.createElement(InvoicePDF, { data: pdfData }),
			);

			// Collect chunks into an array of Buffer
			const chunks: Buffer[] = [];
			for await (const chunk of stream) {
				chunks.push(Buffer.from(chunk));
			}

			// Concatenate all chunks and convert to a plain array for JSON serialization
			const pdfBuffer = Buffer.concat(chunks);
			const pdfArray = Array.from(pdfBuffer);

			return {
				pdf: pdfArray,
				filename: `${invoice.number}.pdf`,
			};
		} catch (err) {
			// Surface font or render failures explicitly (e.g. missing Archivo fonts)
			throw new Error(`Failed to generate PDF: ${(err as Error).message}`);
		}
	});
