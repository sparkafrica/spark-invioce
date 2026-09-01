import { createId } from '@paralleldrive/cuid2';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import {
	businesses,
	invoiceHistory,
	invoiceItems,
	invoices,
	invoiceTranches,
} from '#/db/schema';
import { logActivity, withActivity } from '#/lib/activity';
import { CURRENCIES } from '#/lib/currencies';

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

// helper to compute next number for a business within org
async function computeNextInvoiceNumber(
	businessId: string,
	orgId: string,
	prefix: string,
): Promise<{ nextNumber: string; next: number }> {
	const rows = await db
		.select({ number: invoices.number })
		.from(invoices)
		.where(
			and(
				eq(invoices.organizationId, orgId),
				eq(invoices.businessId, businessId),
			),
		);
	let max = 0;
	for (const r of rows) {
		const m = r.number.match(/(\d+)$/);
		if (m) {
			const n = parseInt(m[1], 10);
			if (!isNaN(n) && n > max) max = n;
		}
	}
	const next = max + 1;
	const nextNumber = `${prefix}-${String(next).padStart(4, '0')}`;
	return { nextNumber, next };
}

export const getLatestInvoiceNumber = createServerFn({ method: 'GET' })
	.validator(z.object({ businessId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const orgId = process.env.ORGANIZATION_ID!;
		const biz = await db
			.select({ prefix: businesses.prefix })
			.from(businesses)
			.where(
				and(
					eq(businesses.id, data.businessId),
					eq(businesses.organizationId, orgId),
				),
			)
			.limit(1);
		if (!biz[0]) throw new Error('Business not found');
		const { nextNumber, next } = await computeNextInvoiceNumber(
			data.businessId,
			orgId,
			biz[0].prefix,
		);
		return { nextNumber, next, prefix: biz[0].prefix };
	});

const createInvoiceSchema = z.object({
	number: z.string().optional().nullable(),
	businessId: z.string().min(1),
	companyId: z.string().min(1),
	clientId: z.string().min(1),
	issueDate: z.string().min(1),
	dueDate: z.string().min(1),
	currency: z.enum(CURRENCIES as unknown as [string, ...string[]]),
	taxName: z.string().default('VAT'),
	taxRate: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.default('7.50'),
	description: z.string().optional().nullable(),
	memo: z.string().optional().nullable(),
	bankId: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? null : v),
		z.string().nullable().optional(),
	),
	paymentType: z.enum(['full', 'tranche']).default('full'),
	paymentMethod: z.enum(['bank', 'link']).default('bank'),
	payLink: z.string().optional().nullable(),
	payLinkLabel: z.string().optional().nullable().default('Pay online'),
	payLinkCurrency: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? null : v),
		z
			.enum(CURRENCIES as unknown as [string, ...string[]])
			.nullable()
			.optional(),
	),
	items: z.array(invoiceItemSchema).min(1),
	tranches: z.array(invoiceTrancheSchema).optional(),
	saveNote: z.string().optional().nullable(),
});

export const createInvoice = createServerFn({ method: 'POST' })
	.validator(createInvoiceSchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string; name: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				const orgId = process.env.ORGANIZATION_ID!;

				// Get business to generate invoice number (org scoped)
				const business = await db
					.select({ prefix: businesses.prefix })
					.from(businesses)
					.where(
						and(
							eq(businesses.id, data.businessId),
							eq(businesses.organizationId, orgId),
						),
					)
					.limit(1);

				if (!business[0]) {
					throw new Error('Business not found');
				}

				const prefix = business[0].prefix;
				const { nextNumber: computedNext, next: initialNext } =
					await computeNextInvoiceNumber(data.businessId, orgId, prefix);

				let invoiceNumber = data.number?.trim() || '';
				const isManual = invoiceNumber !== '';
				if (!isManual) {
					invoiceNumber = computedNext;
				}

				const bankIdVal = (data.bankId as unknown as string | null)?.trim?.()
					? (data.bankId as string).trim()
					: null;
				const payLinkCurrencyVal = (
					data as unknown as { payLinkCurrency?: string | null }
				).payLinkCurrency?.trim?.()
					? (
							data as unknown as { payLinkCurrency: string }
						).payLinkCurrency.trim()
					: null;

				// Normalize payLinkCurrency "" already via preprocess but double ensure
				const finalBankId = bankIdVal === '' ? null : bankIdVal;
				const finalPayLinkCurrency =
					payLinkCurrencyVal === '' ? null : payLinkCurrencyVal;

				let currentNumber = invoiceNumber;
				let nextCounter = initialNext;
				// If manual number, nextCounter stays as computed next for suggestion
				// For auto, nextCounter is the numeric suffix of currentNumber
				if (!isManual) {
					const m = currentNumber.match(/(\d+)$/);
					if (m) nextCounter = parseInt(m[1], 10);
				}

				const invoiceId = createId();
				const now = new Date();
				let inserted = false;
				let attempts = 0;

				while (attempts < 5) {
					try {
						await db.insert(invoices).values({
							id: invoiceId,
							organizationId: orgId,
							number: currentNumber,
							businessId: data.businessId,
							companyId: data.companyId,
							clientId: data.clientId,
							issueDate: new Date(data.issueDate),
							dueDate: new Date(data.dueDate),
							currency:
								data.currency as unknown as typeof invoices.$inferInsert.currency,
							taxName: data.taxName,
							taxRate: data.taxRate,
							description: data.description,
							memo: data.memo,
							bankId: finalBankId,
							paymentType: data.paymentType,
							paymentMethod: data.paymentMethod,
							payLink: data.payLink,
							payLinkLabel: data.payLinkLabel || 'Pay online',
							payLinkCurrency:
								finalPayLinkCurrency as unknown as typeof invoices.$inferInsert.payLinkCurrency,
							status: 'draft',
							createdAt: now,
							updatedAt: now,
						});
						inserted = true;
						invoiceNumber = currentNumber;
						break;
					} catch (e: unknown) {
						const err = e as {
							code?: string;
							message?: string;
							cause?: { code?: string };
						};
						const code = err?.code || err?.cause?.code;
						const msg = String(err?.message || '');
						const isUniqueViolation =
							code === '23505' ||
							msg.includes('23505') ||
							msg.includes('invoices_number_org_unique');
						if (isUniqueViolation) {
							if (isManual) {
								// Suggest next free number (recompute to ensure fresh)
								const fresh = await computeNextInvoiceNumber(
									data.businessId,
									orgId,
									prefix,
								);
								throw new Error(
									`Number already exists — proceed with ${fresh.nextNumber}?`,
								);
							} else {
								// Auto path: increment and retry
								nextCounter += 1;
								currentNumber = `${prefix}-${String(nextCounter).padStart(4, '0')}`;
								attempts += 1;
								continue;
							}
						}
						throw e;
					}
				}

				if (!inserted) {
					throw new Error(
						'Failed to generate unique invoice number after 5 attempts',
					);
				}

				// Create invoice items
				if (data.items.length > 0) {
					await db.insert(invoiceItems).values(
						data.items.map(
							(item: z.infer<typeof invoiceItemSchema>, index: number) => ({
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
							}),
						),
					);
				}

				// Create tranches if payment type is tranche
				if (
					data.paymentType === 'tranche' &&
					data.tranches &&
					data.tranches.length > 0
				) {
					await db.insert(invoiceTranches).values(
						data.tranches.map(
							(
								tranche: z.infer<typeof invoiceTrancheSchema>,
								index: number,
							) => ({
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
							}),
						),
					);
				}

				// Log activity with correct orgId
				await logActivity({
					organizationId: orgId,
					userId: ctx.session.user.id,
					userName: ctx.session.user.name,
					userRole: 'member',
					type: 'Created',
					entity: 'Invoice',
					label: invoiceNumber,
					detail: data.saveNote
						? `Invoice ${invoiceNumber} created — ${data.saveNote}`
						: `Invoice ${invoiceNumber} created for ${ctx.session.user.name}`,
					metadata: data.saveNote ? { saveNote: data.saveNote } : undefined,
				});

				// Insert invoice history snapshot
				try {
					await db.insert(invoiceHistory).values({
						invoiceId,
						userId: ctx.session.user.id,
						userName: ctx.session.user.name,
						action: 'Created',
						note: data.saveNote || null,
						changes: [],
						snapshot: {
							items: data.items.map((i: any) => ({
								name: i.name,
								qty: Number(i.qty),
								cost: Number(i.cost),
								discountName: i.discountName || '',
								discountPct: Number(i.discountPct || 0),
							})),
							tranches: (data.tranches || []).map((t: any) => ({
								name: t.name,
								deliverables: t.deliverables || '',
								due: t.dueDate || '',
								amount: Number(t.amount),
								paid: !!t.paid,
							})),
							currency: data.currency,
							taxName: data.taxName,
							taxRate: Number(data.taxRate),
							dueDate: data.dueDate,
						} as unknown as typeof invoiceHistory.$inferInsert.snapshot,
						createdAt: now,
					});
				} catch {
					// history insert failure should not block invoice creation
				}

				return { invoiceId, number: invoiceNumber };
			},
			{
				entity: 'Invoice',
				getLabel: (_: unknown, result: { number: string }) => result.number,
				getDetail: () => `Invoice created`,
			},
		),
	);

const updateInvoiceSchema = z.object({
	id: z.string().min(1),
	number: z.string().optional().nullable(),
	businessId: z.string().min(1),
	companyId: z.string().min(1),
	clientId: z.string().min(1),
	issueDate: z.string().min(1),
	dueDate: z.string().min(1),
	currency: z.enum(CURRENCIES as unknown as [string, ...string[]]),
	taxName: z.string().default('VAT'),
	taxRate: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.default('7.50'),
	description: z.string().optional().nullable(),
	memo: z.string().optional().nullable(),
	bankId: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? null : v),
		z.string().nullable().optional(),
	),
	paymentType: z.enum(['full', 'tranche']).default('full'),
	paymentMethod: z.enum(['bank', 'link']).default('bank'),
	payLink: z.string().optional().nullable(),
	payLinkLabel: z.string().optional().nullable().default('Pay online'),
	payLinkCurrency: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? null : v),
		z
			.enum(CURRENCIES as unknown as [string, ...string[]])
			.nullable()
			.optional(),
	),
	status: z
		.enum(['draft', 'sent', 'paid', 'part_paid', 'overdue', 'voided'])
		.optional(),
	items: z.array(invoiceItemSchema).min(1),
	tranches: z.array(invoiceTrancheSchema).optional(),
	saveNote: z.string().optional().nullable(),
});

export const updateInvoice = createServerFn({ method: 'POST' })
	.validator(updateInvoiceSchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string; name: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				const orgId = process.env.ORGANIZATION_ID!;
				const now = new Date();

				const bankIdVal = (data.bankId as unknown as string | null)?.trim?.()
					? (data.bankId as string).trim()
					: null;
				const payLinkCurrencyVal = (
					data as unknown as { payLinkCurrency?: string | null }
				).payLinkCurrency?.trim?.()
					? (
							data as unknown as { payLinkCurrency: string }
						).payLinkCurrency.trim()
					: null;
				const finalBankId = bankIdVal === '' ? null : bankIdVal;
				const finalPayLinkCurrency =
					payLinkCurrencyVal === '' ? null : payLinkCurrencyVal;

				// Fetch existing for org scoping and diff
				const existing = await db
					.select({
						id: invoices.id,
						number: invoices.number,
						organizationId: invoices.organizationId,
					})
					.from(invoices)
					.where(
						and(eq(invoices.id, data.id), eq(invoices.organizationId, orgId)),
					)
					.limit(1);
				if (!existing[0]) throw new Error('Invoice not found');

				// If number is being changed, check collision proactively and handle
				let numberToSet: string | undefined;
				if (data.number && data.number.trim() !== '') {
					const trimmed = data.number.trim();
					if (trimmed !== existing[0].number) {
						// Check if another invoice in org already has this number
						const dup = await db
							.select({ id: invoices.id })
							.from(invoices)
							.where(
								and(
									eq(invoices.organizationId, orgId),
									eq(invoices.number, trimmed),
								),
							)
							.limit(1);
						if (dup.length > 0) {
							// Suggest next
							const biz = await db
								.select({ prefix: businesses.prefix })
								.from(businesses)
								.where(
									and(
										eq(businesses.id, data.businessId),
										eq(businesses.organizationId, orgId),
									),
								)
								.limit(1);
							const prefix = biz[0]?.prefix || 'INV';
							const fresh = await computeNextInvoiceNumber(
								data.businessId,
								orgId,
								prefix,
							);
							throw new Error(
								`Number already exists — proceed with ${fresh.nextNumber}?`,
							);
						}
						numberToSet = trimmed;
					}
				}

				// Update invoice (org scoped)
				try {
					await db
						.update(invoices)
						.set({
							...(numberToSet ? { number: numberToSet } : {}),
							businessId: data.businessId,
							companyId: data.companyId,
							clientId: data.clientId,
							issueDate: new Date(data.issueDate),
							dueDate: new Date(data.dueDate),
							currency:
								data.currency as unknown as typeof invoices.$inferInsert.currency,
							taxName: data.taxName,
							taxRate: data.taxRate,
							description: data.description,
							memo: data.memo,
							bankId: finalBankId,
							paymentType: data.paymentType,
							paymentMethod: data.paymentMethod,
							payLink: data.payLink,
							payLinkLabel: data.payLinkLabel || 'Pay online',
							payLinkCurrency:
								finalPayLinkCurrency as unknown as typeof invoices.$inferInsert.payLinkCurrency,
							status: data.status ?? 'draft',
							updatedAt: now,
						})
						.where(
							and(eq(invoices.id, data.id), eq(invoices.organizationId, orgId)),
						);
				} catch (e: unknown) {
					const err = e as {
						code?: string;
						message?: string;
						cause?: { code?: string };
					};
					const code = err?.code || err?.cause?.code;
					const msg = String(err?.message || '');
					if (
						code === '23505' ||
						msg.includes('23505') ||
						msg.includes('invoices_number_org_unique')
					) {
						const biz = await db
							.select({ prefix: businesses.prefix })
							.from(businesses)
							.where(
								and(
									eq(businesses.id, data.businessId),
									eq(businesses.organizationId, orgId),
								),
							)
							.limit(1);
						const prefix = biz[0]?.prefix || 'INV';
						const fresh = await computeNextInvoiceNumber(
							data.businessId,
							orgId,
							prefix,
						);
						throw new Error(
							`Number already exists — proceed with ${fresh.nextNumber}?`,
						);
					}
					throw e;
				}

				// Delete existing items and recreate
				await db
					.delete(invoiceItems)
					.where(eq(invoiceItems.invoiceId, data.id));

				if (data.items.length > 0) {
					await db.insert(invoiceItems).values(
						data.items.map(
							(item: z.infer<typeof invoiceItemSchema>, index: number) => ({
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
							}),
						),
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
						data.tranches.map(
							(
								tranche: z.infer<typeof invoiceTrancheSchema>,
								index: number,
							) => ({
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
							}),
						),
					);
				}

				// Log history with saveNote
				try {
					await db.insert(invoiceHistory).values({
						invoiceId: data.id,
						userId: ctx.session.user.id,
						userName: ctx.session.user.name,
						action: 'Edited',
						note: data.saveNote || null,
						changes: [],
						snapshot: {
							items: data.items.map((i: any) => ({
								name: i.name,
								qty: Number(i.qty),
								cost: Number(i.cost),
								discountName: i.discountName || '',
								discountPct: Number(i.discountPct || 0),
							})),
							tranches: (data.tranches || []).map((t: any) => ({
								name: t.name,
								deliverables: t.deliverables || '',
								due: t.dueDate || '',
								amount: Number(t.amount),
								paid: !!t.paid,
							})),
							currency: data.currency,
							taxName: data.taxName,
							taxRate: Number(data.taxRate),
							dueDate: data.dueDate,
						} as unknown as typeof invoiceHistory.$inferInsert.snapshot,
						createdAt: now,
					});
					if (data.saveNote) {
						await logActivity({
							organizationId: orgId,
							userId: ctx.session.user.id,
							userName: ctx.session.user.name,
							userRole: 'member',
							type: 'Edited',
							entity: 'Invoice',
							label: numberToSet || existing[0].number,
							detail: data.saveNote,
						});
					}
				} catch {
					// ignore history errors
				}

				return { success: true };
			},
			{
				entity: 'Invoice',
				getLabel: (_args: { id: string }) => _args.id,
				getDetail: (_args: unknown, _result: unknown, changes: unknown) => {
					const ch = changes as
						| Array<{ field: string; from: string; to: string }>
						| undefined;
					return ch && ch.length > 0
						? `Updated invoice: ${ch.map((c) => `${c.field}: ${c.from} → ${c.to}`).join('; ')}`
						: 'Invoice updated';
				},
			},
		),
	);
