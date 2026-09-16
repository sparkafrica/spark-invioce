import { and, inArray, lt } from 'drizzle-orm';
import { db } from '#/db';
import { activityLog, invoiceHistory, invoices } from '#/db/schema';

// Statuses eligible for auto-overdue. Excludes draft (not yet sent),
// paid / voided / overdue (terminal or already overdue).
const ELIGIBLE_STATUSES = ['due', 'part_paid'] as const;

export interface MarkOverdueOptions {
	dryRun?: boolean;
	limit?: number;
}

export interface MarkOverdueResult {
	success: boolean;
	checkedAt: string;
	startOfToday: string;
	updatedCount: number;
	dryRun: boolean;
	updated: Array<{
		id: string;
		number: string;
		prevStatus: string;
		dueDate: string;
	}>;
}

/**
 * Shared overdue business logic as a plain async function.
 *
 * NOTE: intentionally NOT a createServerFn. createServerFn wrappers carry
 * RPC/client-serialization machinery and must not be imported into Nitro
 * API route handlers (it fails in prod). API routes import this plain
 * function directly. If client components ever need the same logic, add a
 * thin createServerFn wrapper in src/lib/server-fns/ that calls this.
 */
export async function markOverdueInvoices(
	options: MarkOverdueOptions = {},
): Promise<MarkOverdueResult> {
	const dryRun = options.dryRun ?? false;
	const limit = Math.min(Math.max(options.limit ?? 500, 1), 1000);
	const now = new Date();
	const startOfToday = new Date(now);
	startOfToday.setUTCHours(0, 0, 0, 0);

	// Find invoices past due date that are still due / part_paid
	const candidates = await db
		.select({
			id: invoices.id,
			number: invoices.number,
			status: invoices.status,
			dueDate: invoices.dueDate,
		})
		.from(invoices)
		.where(
			and(
				lt(invoices.dueDate, startOfToday),
				inArray(invoices.status, [...ELIGIBLE_STATUSES]),
			),
		)
		.limit(limit);

	const updated = candidates.map((c) => ({
		id: c.id,
		number: c.number,
		prevStatus: c.status,
		dueDate: c.dueDate instanceof Date ? c.dueDate.toISOString() : String(c.dueDate),
	}));

	// Guard: no candidates or dry-run — return before any write.
	// Without this, drizzle's .values([]) throws
	// "values() must be called with at least one value" and
	// .where(inArray(..., [])) generates invalid SQL.
	if (candidates.length === 0 || dryRun) {
		return {
			success: true,
			checkedAt: now.toISOString(),
			startOfToday: startOfToday.toISOString(),
			updatedCount: 0,
			dryRun,
			updated,
		};
	}

	const ids = candidates.map((c) => c.id);

	// Bulk status update
	await db
		.update(invoices)
		.set({ status: 'overdue', updatedAt: now })
		.where(inArray(invoices.id, ids));

	// Per-invoice audit history (cron as actor)
	try {
		await db.insert(invoiceHistory).values(
			candidates.map((c) => ({
				invoiceId: c.id,
				userId: 'system',
				userName: 'cron',
				action: 'Auto-overdue',
				note: 'Past due date — auto-marked overdue by cron',
				changes: [{ field: 'status', from: c.status, to: 'overdue' }],
				createdAt: now,
			})),
		);
	} catch (error) {
		console.error('Overdue cron history insert failed:', error);
	}

	// Single summary activity entry
	try {
		await db.insert(activityLog).values({
			userId: 'system',
			userName: 'cron',
			type: 'Edited',
			entity: 'Invoice',
			label: `${candidates.length} invoice(s)`,
			detail: `Auto-marked ${candidates.length} invoice(s) overdue (past due date)`,
			metadata: {
				changes: [],
				cron: 'overdue',
				count: candidates.length,
				numbers: candidates.map((c) => c.number),
			},
		});
	} catch (error) {
		console.error('Overdue cron activity insert failed:', error);
	}

	return {
		success: true,
		checkedAt: now.toISOString(),
		startOfToday: startOfToday.toISOString(),
		updatedCount: candidates.length,
		dryRun: false,
		updated,
	};
}
