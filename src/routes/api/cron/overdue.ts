import { createFileRoute } from '@tanstack/react-router';
import { and, inArray, lt } from 'drizzle-orm';
import { db } from '#/db';
import { activityLog, invoiceHistory, invoices } from '#/db/schema';

// Statuses eligible for auto-overdue. Excludes draft (not yet sent),
// paid / voided / overdue (terminal or already overdue).
const ELIGIBLE_STATUSES = ['due', 'part_paid'] as const;

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return true;
	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}

export async function markOverdueInvoicesCron() {
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
		);

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
		updated: candidates.map((c) => ({
			id: c.id,
			number: c.number,
			prevStatus: c.status,
			dueDate:
				c.dueDate instanceof Date ? c.dueDate.toISOString() : String(c.dueDate),
		})),
	};
}

async function handle(request: Request): Promise<Response> {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	try {
		const result = await markOverdueInvoicesCron();
		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Overdue cron error:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Cron failed',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
}

export const Route = createFileRoute('/api/cron/overdue')({
	server: {
		handlers: {
			GET: async ({ request }) => handle(request),
			POST: async ({ request }) => handle(request),
		},
	},
});
