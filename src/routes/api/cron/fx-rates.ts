import { createFileRoute } from '@tanstack/react-router';
import { fetchFXRates } from '#/lib/server/fx-rates';

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return true;
	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}

export const Route = createFileRoute('/api/cron/fx-rates')({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				if (!isAuthorized(request)) {
					return new Response(JSON.stringify({ error: 'Unauthorized' }), {
						status: 401,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				try {
					const result = await fetchFXRates();
					return new Response(JSON.stringify(result), {
						headers: { 'Content-Type': 'application/json' },
					});
				} catch (error) {
					console.error('FX rates cron error:', error);
					return new Response(
						JSON.stringify({ error: 'FX rates update failed' }),
						{
							status: 500,
							headers: { 'Content-Type': 'application/json' },
						},
					);
				}
			},
		},
	},
});
