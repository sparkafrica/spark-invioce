import { createId } from '@paralleldrive/cuid2';
import { createServerFn } from '@tanstack/react-start';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import {
	businesses,
	invoiceItems,
	invoices,
	invoiceTranches,
} from '#/db/schema';

const invoiceItemSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional().nullable(),
	qty: z.string().regex(/^\d+(\.\d+)?$/),
	cost: z.string().regex(/^\d+(\.\d+)?$/),
	discountName: z.string().optional().nullable(),
	discountPct: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
	discountAmt: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
	sortOrder: z.number().int().nonnegative(),
});

const invoiceTrancheSchema = z.object({
	name: z.string().min(1),
	deliverables: z.string().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	amount: z.string().regex(/^\d+(\.\d+)?$/),
	paid: z.boolean().optional(),
	sortOrder: z.number().int().nonnegative(),
});

const createInvoiceSchema = z.object({
	businessId: z.string().min(1),
	companyId: z.string().min(1),
	clientId: z.string().min(1),
	issueDate: z.string().min(1),
	dueDate: z.string().min(1),
	currency: z.string().min(1),
	taxName: z.string().default('VAT'),
	taxRate: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.default('7.50'),
	description: z.string().optional().nullable(),
	memo: z.string().optional().nullable(),
	bankId: z.string().optional().nullable(),
	paymentType: z.enum(['full', 'tranche']).default('full'),
	paymentMethod: z.enum(['bank', 'link']).default('bank'),
	payLink: z.string().optional().nullable(),
	payLinkLabel: z.string().default('Pay online'),
	items: z.array(invoiceItemSchema).min(1),
	tranches: z.array(invoiceTrancheSchema).optional(),
});

export const createInvoice = createServerFn({ method: 'POST' })
	.validator(createInvoiceSchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string; name: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		// Get business to generate invoice number
		const business = await db
			.select({ prefix: businesses.prefix })
			.from(businesses)
			.where(eq(businesses.id, data.businessId))
			.limit(1);

		if (!business[0]) {
			throw new Error('Business not found');
		}

		// Get latest invoice number for this business to generate next
		const latestInvoice = await db
			.select({ number: invoices.number })
			.from(invoices)
			.where(eq(invoices.businessId, data.businessId))
			.orderBy(desc(invoices.createdAt))
			.limit(1);

		let nextNumber = 1;
		if (latestInvoice[0]) {
			const match = latestInvoice[0].number.match(/(\d+)$/);
			if (match) {
				nextNumber = parseInt(match[1], 10) + 1;
			}
		}

		const invoiceNumber = `${business[0].prefix}-${String(nextNumber).padStart(4, '0')}`;

		const invoiceId = createId();
		const now = new Date();

		// Create invoice
		await db.insert(invoices).values({
			id: invoiceId,
			organizationId: 'default-org',
			number: invoiceNumber,
			businessId: data.businessId,
			companyId: data.companyId,
			clientId: data.clientId,
			issueDate: new Date(data.issueDate),
			dueDate: new Date(data.dueDate),
			currency: data.currency as any,
			taxName: data.taxName,
			taxRate: data.taxRate,
			description: data.description,
			memo: data.memo,
			bankId: data.bankId,
			paymentType: data.paymentType,
			paymentMethod: data.paymentMethod,
			payLink: data.payLink,
			payLinkLabel: data.payLinkLabel,
			status: 'draft',
			createdAt: now,
			updatedAt: now,
		});

		// Create invoice items
		if (data.items.length > 0) {
			await db.insert(invoiceItems).values(
				data.items.map((item, index) => ({
					id: createId(),
					invoiceId,
					name: item.name,
					description: item.description,
					qty: item.qty,
					cost: item.cost,
					discountName: item.discountName,
					discountPct: item.discountPct ?? '0',
					discountAmt: item.discountAmt ?? '0',
					sortOrder: item.sortOrder ?? index,
					createdAt: now,
					updatedAt: now,
				})),
			);
		}

		// Create tranches if payment type is tranche
		if (
			data.paymentType === 'tranche' &&
			data.tranches &&
			data.tranches.length > 0
		) {
			await db.insert(invoiceTranches).values(
				data.tranches.map((tranche, index) => ({
					id: createId(),
					invoiceId,
					name: tranche.name,
					deliverables: tranche.deliverables,
					dueDate: tranche.dueDate ? new Date(tranche.dueDate) : null,
					amount: tranche.amount,
					paid: tranche.paid ?? false,
					sortOrder: tranche.sortOrder ?? index,
					createdAt: now,
					updatedAt: now,
				})),
			);
		}

		return { invoiceId, number: invoiceNumber };
	});

const updateInvoiceSchema = z.object({
	id: z.string().min(1),
	businessId: z.string().min(1),
	companyId: z.string().min(1),
	clientId: z.string().min(1),
	issueDate: z.string().min(1),
	dueDate: z.string().min(1),
	currency: z.string().min(1),
	taxName: z.string().default('VAT'),
	taxRate: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.default('7.50'),
	description: z.string().optional().nullable(),
	memo: z.string().optional().nullable(),
	bankId: z.string().optional().nullable(),
	paymentType: z.enum(['full', 'tranche']).default('full'),
	paymentMethod: z.enum(['bank', 'link']).default('bank'),
	payLink: z.string().optional().nullable(),
	payLinkLabel: z.string().default('Pay online'),
	status: z
		.enum(['draft', 'sent', 'paid', 'part_paid', 'overdue', 'voided'])
		.optional(),
	items: z.array(invoiceItemSchema).min(1),
	tranches: z.array(invoiceTrancheSchema).optional(),
});

export const updateInvoice = createServerFn({ method: 'POST' })
	.validator(updateInvoiceSchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string; name: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const now = new Date();

		// Update invoice
		await db
			.update(invoices)
			.set({
				businessId: data.businessId,
				companyId: data.companyId,
				clientId: data.clientId,
				issueDate: new Date(data.issueDate),
				dueDate: new Date(data.dueDate),
				currency: data.currency as any,
				taxName: data.taxName,
				taxRate: data.taxRate,
				description: data.description,
				memo: data.memo,
				bankId: data.bankId,
				paymentType: data.paymentType,
				paymentMethod: data.paymentMethod,
				payLink: data.payLink,
				payLinkLabel: data.payLinkLabel,
				status: data.status ?? 'draft',
				updatedAt: now,
			})
			.where(eq(invoices.id, data.id));

		// Delete existing items and recreate
		await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, data.id));

		if (data.items.length > 0) {
			await db.insert(invoiceItems).values(
				data.items.map((item, index) => ({
					id: createId(),
					invoiceId: data.id,
					name: item.name,
					description: item.description,
					qty: item.qty,
					cost: item.cost,
					discountName: item.discountName,
					discountPct: item.discountPct ?? '0',
					discountAmt: item.discountAmt ?? '0',
					sortOrder: item.sortOrder ?? index,
					createdAt: now,
					updatedAt: now,
				})),
			);
		}

		// Delete existing tranches and recreate
		await db
			.delete(invoiceTranches)
			.where(eq(invoiceTranches.invoiceId, data.id));

		if (
			data.paymentType === 'tranche' &&
			data.tranches &&
			data.tranches.length > 0
		) {
			await db.insert(invoiceTranches).values(
				data.tranches.map((tranche, index) => ({
					id: createId(),
					invoiceId: data.id,
					name: tranche.name,
					deliverables: tranche.deliverables,
					dueDate: tranche.dueDate ? new Date(tranche.dueDate) : null,
					amount: tranche.amount,
					paid: tranche.paid ?? false,
					sortOrder: tranche.sortOrder ?? index,
					createdAt: now,
					updatedAt: now,
				})),
			);
		}

		return { success: true };
	});
