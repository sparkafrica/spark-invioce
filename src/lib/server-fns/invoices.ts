/** biome-ignore-all lint/suspicious/noExplicitAny: allow any */
import { createServerFn } from '@tanstack/react-start';
import { and, asc, count, desc, eq, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import {
	businesses,
	clients,
	comments,
	invoiceHistory,
	invoiceItems,
	invoices,
	invoiceTranches,
	payments} from '#/db/schema';
import { user } from '#/db/auth-schema';
import { logActivity } from '#/lib/activity';

type InvoiceStatus =
	| 'draft'
	| 'paid'
	| 'part_paid'
	| 'due'
	| 'overdue'
	| 'voided';

interface InvoiceResult {
	id: string;
	number: string;
	client: string;
	business: string;
	issued: string;
	due: string;
	type: 'full' | 'tranche';
	currency: string;
	total: string;
	status: InvoiceStatus;
	commentCount: number;
}

interface GetInvoicesResponse {
	invoices: InvoiceResult[];
	total: number;
	page: number;
	pageSize: number;
}

export const getInvoices = createServerFn({ method: 'GET' })
	.validator(
		z.object({
			page: z.number().min(0).default(0),
			pageSize: z.number().min(1).max(100).default(10),
			sortBy: z.string().optional(),
			sortDir: z.enum(['asc', 'desc']).optional(),
			filter: z.string().optional(),
			status: z.string().optional(),
			businessId: z.string().optional()}),
	)
	.handler(async ({ data }): Promise<GetInvoicesResponse> => {
		const { page, pageSize, sortBy, sortDir, filter, status, businessId } =
			data;

		const whereConditions = [];

		if (status) {
			whereConditions.push(eq(invoices.status, status as InvoiceStatus));
		}

		if (businessId) {
			whereConditions.push(eq(invoices.businessId, businessId));
		}

		if (filter) {
			const filterCond = or(
				like(invoices.number, `%${filter}%`),
				like(clients.name, `%${filter}%`),
				like(businesses.name, `%${filter}%`),
			);
			if (filterCond) whereConditions.push(filterCond);
		}

		const whereClause = and(...whereConditions);

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(invoices)
			.leftJoin(clients, eq(invoices.clientId, clients.id))
			.leftJoin(businesses, eq(invoices.businessId, businesses.id))
			.where(whereClause);

		// Build order by
		const columnMap = {
			number: invoices.number,
			client: clients.name,
			business: businesses.name,
			issued: invoices.issueDate,
			due: invoices.dueDate,
			type: invoices.paymentType,
			status: invoices.status} as const;
		let orderByClause = desc(invoices.createdAt);
		if (sortBy) {
			const sortKey = sortBy as keyof typeof columnMap;
			const column = sortKey in columnMap ? columnMap[sortKey] : undefined;
			if (column) {
				orderByClause = sortDir === 'desc' ? desc(column) : asc(column);
			}
		}

		const results = await db
			.select({
				id: invoices.id,
				number: invoices.number,
				clientName: clients.name,
				businessName: businesses.name,
				issued: invoices.issueDate,
				due: invoices.dueDate,
				type: invoices.paymentType,
				currency: invoices.currency,
				taxRate: invoices.taxRate,
				status: invoices.status,
				// Calculate subtotal from invoice items
				subtotal: sql<number>`COALESCE((
					SELECT SUM((ii.qty * ii.cost) * (1 - COALESCE(ii.discount_pct, 0) / 100) - COALESCE(ii.discount_amt, 0))
					FROM invoice_items ii
					WHERE ii.invoice_id = ${invoices.id}
				), 0)`})
			.from(invoices)
			.leftJoin(clients, eq(invoices.clientId, clients.id))
			.leftJoin(businesses, eq(invoices.businessId, businesses.id))
			.where(whereClause)
			.orderBy(orderByClause)
			.limit(pageSize)
			.offset(page * pageSize);

		// Calculate totals with tax
		const invoicesWithTotals: InvoiceResult[] = results.map((r) => {
			const subtotal = Number(r.subtotal || 0);
			const taxRate = Number(r.taxRate || 0);
			const totalWithTax = subtotal * (1 + taxRate / 100);
			return {
				id: r.id,
				number: r.number,
				client: r.clientName || '',
				business: r.businessName || '',
				issued: r.issued ? new Date(r.issued).toISOString().slice(0, 10) : '',
				due: r.due ? new Date(r.due).toISOString().slice(0, 10) : '',
				type: r.type,
				currency: r.currency || 'NGN',
				total: totalWithTax.toFixed(2),
				status: r.status,
				commentCount: 0};
		});

		return {
			invoices: invoicesWithTotals,
			total,
			page,
			pageSize};
	});

function getSessionUserInInvoices(ctx: unknown): { id: string; name?: string; role?: string | null } | null {
	const c = ctx as Record<string, unknown>;
	return (c?.user as { id: string; name?: string; role?: string | null } | null)
		?? (c?.session as unknown as { user?: { id: string; name?: string; role?: string | null } | null } | null)?.user
		?? null;
}
export const deleteInvoice = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as Record<string, unknown>;
		const sessionUser = getSessionUserInInvoices(ctx);
		if (!sessionUser?.id) {
			throw new Error('Unauthorized');
		}
		const roleFromSession = (sessionUser as unknown as { role?: string | null })?.role;
		if (roleFromSession !== 'owner' && roleFromSession !== 'admin') {
			const rows = await db.select({ role: user.role }).from(user).where(eq(user.id, sessionUser.id)).limit(1);
			const role = rows[0]?.role;
			if (role !== 'owner' && role !== 'admin') throw new Error('Forbidden: owner or admin only');
		}

		const existing = await db
			.select({ number: invoices.number })
			.from(invoices)
			.where(eq(invoices.id, data.id))
			.limit(1);
		const number = existing[0]?.number ?? data.id;

		// Delete related records first (cascade should handle this, but being explicit)
		await db.delete(invoiceHistory).where(eq(invoiceHistory.invoiceId, data.id));
		await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, data.id));
		await db
			.delete(invoiceTranches)
			.where(eq(invoiceTranches.invoiceId, data.id));
		await db.delete(payments).where(eq(payments.invoiceId, data.id));
		await db.delete(comments).where(eq(comments.invoiceId, data.id));

		// Delete invoice
		await db.delete(invoices).where(eq(invoices.id, data.id));

		try {
			await logActivity({
				userId: sessionUser.id,
				userName: sessionUser.name ?? 'Unknown',
				userRole: 'member',
				type: 'Deleted',
				entity: 'Invoice',
				label: number,
				detail: `Invoice ${number} deleted`,
			});
		} catch {
			// ignore
		}

		return { success: true };
	});