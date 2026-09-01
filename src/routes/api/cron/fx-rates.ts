import { createFileRoute } from '@tanstack/react-router';
import { fetchFXRatesCron } from '#/lib/server/fx-rates';

export const Route = createFileRoute('/api/cron/fx-rates')({
	server: {
		handlers: {
			GET: async () => {
				const result = await fetchFXRatesCron();
				return new Response(JSON.stringify(result), {
					headers: { 'Content-Type': 'application/json' },
				});
			},
		},
	},
});
