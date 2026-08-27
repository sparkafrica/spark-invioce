export const CURRENCIES = [
  'NGN','USD','GBP','EUR','KES','GHS','ZAR','EGP','RWF','TZS','UGX','XOF','XAF',
  'MAD','ETB','ZMW','BWP','MUR','CAD','AUD','NZD','CHF','SEK','NOK','DKK','PLN',
  'CZK','TRY','AED','SAR','QAR','ILS','INR','PKR','BDT','LKR','CNY','JPY','KRW',
  'HKD','SGD','MYR','THB','IDR','PHP','VND','BRL','MXN','ARS','CLP','COP','PEN',
  'RUB','UAH','RON','HUF','ISK','JOD','KWD','BHD','OMR','TND','DZD','MZN',
] as const;

export type Currency = typeof CURRENCIES[number];
export const CURRENCY_LABEL: Record<Currency, string> = Object.fromEntries(CURRENCIES.map(c=>[c,c])) as Record<Currency,string>;

export const formatCurrency = (amount: number, currency: Currency = 'NGN') => {
  try {
    return new Intl.NumberFormat('en-NG', { style:'currency', currency, minimumFractionDigits:2 }).format(amount);
  } catch { return `${currency} ${amount.toFixed(2)}`; }
};
