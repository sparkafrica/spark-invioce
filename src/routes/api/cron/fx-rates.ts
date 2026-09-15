import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';
import { db } from '#/db';
import { settings } from '#/db/schema';

const API_KEY = process.env.EXCHANGERATE_API_KEY;
const BASE_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const TARGET_CURRENCIES = ['NGN', 'GBP', 'EUR', 'KES', 'GHS', 'ZAR'];

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return true;
	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}

export const fetchFXRatesCron = async () => {
	try {
		// Check if FX rates are set to API mode
		const [fxSetting] = await db
			.select({ value: settings.value })
			.from(settings)
			.where(eq(settings.key, 'fx-rates'))
			.limit(1);

		const fxData = fxSetting?.value as {
			mode?: string;
			rates?: Record<string, number>;
		} | null;
		if (!fxData || fxData.mode !== 'api') {
			return { skipped: true, reason: 'FX rates not in API mode' };
		}

		if (!API_KEY) {
			throw new Error('EXCHANGERATE_API_KEY not configured');
		}

		// Fetch rates from exchangerate-api.com
		const response = await fetch(`${BASE_URL}?api_key=${API_KEY}`);
		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const apiData = await response.json();
		if (!apiData.rates) {
			throw new Error('Invalid API response');
		}

		// Filter and build rates object
		const rates: Record<string, number> = { USD: 1 };
		for (const code of TARGET_CURRENCIES) {
			if (apiData.rates[code]) {
				rates[code] = apiData.rates[code];
			} else if (fxData.rates?.[code]) {
				rates[code] = fxData.rates[code];
			}
		}

		// Update settings
		await db
			.insert(settings)
			.values({
				key: 'fx-rates',
				value: {
					mode: 'api',
					rates,
					lastFetched: new Date().toISOString(),
				},
			})
			.onConflictDoUpdate({
				target: [settings.key],
				set: {
					value: {
						mode: 'api',
						rates,
						lastFetched: new Date().toISOString(),
					},
					updatedAt: new Date(),
				},
			});

		return { success: true, rates, updatedAt: new Date().toISOString() };
	} catch (error) {
		console.error('FX rates cron error:', error);
		throw error;
	}
};

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

				try {
					const result = await fetchFXRatesCron();
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
