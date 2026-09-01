import { countries } from 'countries-list';

const DB_CURRENCY_CODES = [
	'NGN',
	'USD',
	'GBP',
	'EUR',
	'KES',
	'GHS',
	'ZAR',
	'EGP',
	'RWF',
	'TZS',
	'UGX',
	'XOF',
	'XAF',
	'MAD',
	'ETB',
	'ZMW',
	'BWP',
	'MUR',
	'CAD',
	'AUD',
	'NZD',
	'CHF',
	'SEK',
	'NOK',
	'DKK',
	'PLN',
	'CZK',
	'TRY',
	'AED',
	'SAR',
	'QAR',
	'ILS',
	'INR',
	'PKR',
	'BDT',
	'LKR',
	'CNY',
	'JPY',
	'KRW',
	'HKD',
	'SGD',
	'MYR',
	'THB',
	'IDR',
	'PHP',
	'VND',
	'BRL',
	'MXN',
	'ARS',
	'CLP',
	'COP',
	'PEN',
	'RUB',
	'UAH',
	'RON',
	'HUF',
	'ISK',
	'JOD',
	'KWD',
	'BHD',
	'OMR',
	'TND',
	'DZD',
	'MZN',
] as const;

const CURRENCY_NAMES: Record<string, string> = {
	NGN: 'Nigerian Naira',
	USD: 'United States Dollar',
	EUR: 'Euro',
	GBP: 'British Pound Sterling',
	KES: 'Kenyan Shilling',
	GHS: 'Ghanaian Cedi',
	ZAR: 'South African Rand',
	EGP: 'Egyptian Pound',
	RWF: 'Rwandan Franc',
	TZS: 'Tanzanian Shilling',
	UGX: 'Ugandan Shilling',
	XOF: 'West African CFA Franc',
	XAF: 'Central African CFA Franc',
	MAD: 'Moroccan Dirham',
	ETB: 'Ethiopian Birr',
	ZMW: 'Zambian Kwacha',
	BWP: 'Botswana Pula',
	MUR: 'Mauritian Rupee',
	CAD: 'Canadian Dollar',
	AUD: 'Australian Dollar',
	NZD: 'New Zealand Dollar',
	CHF: 'Swiss Franc',
	SEK: 'Swedish Krona',
	NOK: 'Norwegian Krone',
	DKK: 'Danish Krone',
	PLN: 'Polish Złoty',
	CZK: 'Czech Koruna',
	TRY: 'Turkish Lira',
	AED: 'United Arab Emirates Dirham',
	SAR: 'Saudi Riyal',
	QAR: 'Qatari Riyal',
	ILS: 'Israeli New Shekel',
	INR: 'Indian Rupee',
	PKR: 'Pakistani Rupee',
	BDT: 'Bangladeshi Taka',
	LKR: 'Sri Lankan Rupee',
	CNY: 'Chinese Yuan',
	JPY: 'Japanese Yen',
	KRW: 'South Korean Won',
	HKD: 'Hong Kong Dollar',
	SGD: 'Singapore Dollar',
	MYR: 'Malaysian Ringgit',
	THB: 'Thai Baht',
	IDR: 'Indonesian Rupiah',
	PHP: 'Philippine Peso',
	VND: 'Vietnamese Đồng',
	BRL: 'Brazilian Real',
	MXN: 'Mexican Peso',
	ARS: 'Argentine Peso',
	CLP: 'Chilean Peso',
	COP: 'Colombian Peso',
	PEN: 'Peruvian Sol',
	RUB: 'Russian Ruble',
	UAH: 'Ukrainian Hryvnia',
	RON: 'Romanian Leu',
	HUF: 'Hungarian Forint',
	ISK: 'Icelandic Króna',
	JOD: 'Jordanian Dinar',
	KWD: 'Kuwaiti Dinar',
	BHD: 'Bahraini Dinar',
	OMR: 'Omani Rial',
	TND: 'Tunisian Dinar',
	DZD: 'Algerian Dinar',
	MZN: 'Mozambican Metical',
};

const allowedCurrencySet = new Set<string>(DB_CURRENCY_CODES);

// Build a flat list of unique currencies for the DB-approved set only.
const currencyMap = new Map<
	string,
	{ code: string; name: string; symbol?: string; country?: string }
>();

Object.entries(countries).forEach(([, data]) => {
	const countryName = data.name;

	data.currency.forEach((curr) => {
		if (!allowedCurrencySet.has(curr) || currencyMap.has(curr)) {
			return;
		}

		const friendlyName =
			CURRENCY_NAMES[curr] || `${countryName} ${curr}`;

		currencyMap.set(curr, {
			code: curr,
			name: friendlyName,
			symbol: undefined,
			country: countryName,
		});
	});
});

export const CURRENCIES = [...DB_CURRENCY_CODES] as readonly string[];
export type Currency = (typeof CURRENCIES)[number];

export interface CurrencyInfo {
	code: string;
	name: string;
	symbol?: string;
	country?: string;
}

export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = Object.fromEntries(
	CURRENCIES.map((code) => {
		const info = currencyMap.get(code);
		if (!info) {
			return [code, { code, name: code }];
		}
		return [code, info];
	}),
) as Record<Currency, CurrencyInfo>;

export const DEFAULT_FX_RATES: Record<string, number> = {
	USD: 1,
	NGN: 1530,
	GBP: 0.74,
	EUR: 0.86,
	KES: 129.45,
	GHS: 12.4,
	ZAR: 18.1,
	RWF: 1297.5,
};

export const convertCurrencyValue = (
	amount: number,
	fromCurrency?: string,
	targetCurrency?: string,
	rates: Record<string, number> = DEFAULT_FX_RATES,
) => {
	const from = (fromCurrency ?? 'NGN').trim().toUpperCase();
	const target = (targetCurrency ?? 'NGN').trim().toUpperCase();
	if (!Number.isFinite(amount)) return 0;
	if (!from || !target || from === target) return amount;

	const fromRate = Number(rates[from] ?? 0);
	const targetRate = Number(rates[target] ?? 0);
	if (!fromRate || !targetRate) return amount;

	return (amount / fromRate) * targetRate;
};

export const formatCurrency = (amount: number, currency: Currency = 'NGN') => {
	try {
		return new Intl.NumberFormat('en-NG', {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
		}).format(amount);
	} catch {
		const sym = CURRENCY_INFO[currency]?.symbol ?? currency;
		return `${sym} ${amount.toFixed(2)}`;
	}
};

export const filterCurrencies = (searchQuery: string): Currency[] => {
	const q = searchQuery.toLowerCase().trim();

	if (!q) {
		return CURRENCIES as Currency[];
	}

	return CURRENCIES.filter((code) => {
		const c = CURRENCY_INFO[code as Currency];
		return (
			c.code.toLowerCase().includes(q) ||
			c.name.toLowerCase().includes(q) ||
			(c.country?.toLowerCase().includes(q) ?? false)
		);
	}) as Currency[];
};
