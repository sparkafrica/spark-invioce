import { describe, expect, it } from 'vitest';
import { convertCurrencyValue } from './currencies';

describe('convertCurrencyValue', () => {
	it('converts based on USD-per-unit rates without labeling the value as the source currency', () => {
		const rates = {
			USD: 1,
			NGN: 1530,
			GBP: 0.74,
		};

		expect(convertCurrencyValue(1530, 'NGN', 'USD', rates)).toBeCloseTo(1, 5);
		expect(convertCurrencyValue(1, 'USD', 'NGN', rates)).toBeCloseTo(1530, 5);
		expect(convertCurrencyValue(1000, 'NGN', 'NGN', rates)).toBe(1000);
	});
});
