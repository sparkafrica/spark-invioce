import { createFileRoute } from '@tanstack/react-router';
import { fetchFXRatesCron } from '#/lib/server/fx-rates';

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return true;
	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}

export const Route = createFileRoute('/api/cron/fx-rates')({
	server: {
		handlers: {
			GET: async ({ request }) => {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
				const result = await fetchFXRatesCron();
				return new Response(JSON.stringify(result), {
					headers: { 'Content-Type': 'application/json' },
				});
			},
		},
	},
});
