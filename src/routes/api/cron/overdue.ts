import { createFileRoute } from '@tanstack/react-router';
import { markOverdueInvoicesCron } from '#/lib/server/overdue';

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return true;
	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}

function parseParams(url: string): { dryRun: boolean; limit: number } {
	const u = new URL(url);
	const dryRun =
		u.searchParams.get('dryRun') === '1' ||
		u.searchParams.get('dryRun') === 'true';
	const rawLimit = Number(u.searchParams.get('limit'));
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0
			? Math.min(Math.floor(rawLimit), 1000)
			: 500;
	return { dryRun, limit };
}

async function handle(request: Request): Promise<Response> {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	try {
		const { dryRun, limit } = parseParams(request.url);
		const result = await markOverdueInvoicesCron({ data: { dryRun, limit } });
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
