import { usePageContent } from '@/hooks/usePageContent';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'before' | 'after';
}

const CURRENCY_LIST: CurrencyConfig[] = [
  { code: 'BDT', symbol: '৳', position: 'before' },
  { code: 'USD', symbol: '$', position: 'before' },
  { code: 'EUR', symbol: '€', position: 'before' },
  { code: 'GBP', symbol: '£', position: 'before' },
  { code: 'INR', symbol: '₹', position: 'before' },
  { code: 'PKR', symbol: '₨', position: 'before' },
  { code: 'SAR', symbol: '﷼', position: 'after' },
  { code: 'AED', symbol: 'د.إ', position: 'after' },
  { code: 'MYR', symbol: 'RM', position: 'before' },
  { code: 'SGD', symbol: 'S$', position: 'before' },
  { code: 'JPY', symbol: '¥', position: 'before' },
  { code: 'CNY', symbol: '¥', position: 'before' },
  { code: 'KRW', symbol: '₩', position: 'before' },
  { code: 'THB', symbol: '฿', position: 'before' },
  { code: 'TRY', symbol: '₺', position: 'before' },
  { code: 'RUB', symbol: '₽', position: 'after' },
  { code: 'BRL', symbol: 'R$', position: 'before' },
  { code: 'AUD', symbol: 'A$', position: 'before' },
  { code: 'CAD', symbol: 'C$', position: 'before' },
  { code: 'NGN', symbol: '₦', position: 'before' },
  { code: 'EGP', symbol: 'E£', position: 'before' },
  { code: 'KWD', symbol: 'د.ك', position: 'after' },
  { code: 'QAR', symbol: 'ر.ق', position: 'after' },
  { code: 'OMR', symbol: 'ر.ع', position: 'after' },
  { code: 'BHD', symbol: 'BD', position: 'before' },
];

export { CURRENCY_LIST };

const DEFAULT_CURRENCY: CurrencyConfig = { code: 'BDT', symbol: '৳', position: 'before' };

export const useCurrency = () => {
  const { data: currencyData } = usePageContent('currency_settings');

  const config: CurrencyConfig = (() => {
    if (currencyData && typeof currencyData === 'object') {
      const d = currencyData as any;
      return {
        code: d.code || DEFAULT_CURRENCY.code,
        symbol: d.symbol || DEFAULT_CURRENCY.symbol,
        position: d.position || DEFAULT_CURRENCY.position,
      };
    }
    return DEFAULT_CURRENCY;
  })();

  const formatPrice = (amount: number, decimals?: number): string => {
    const dec = decimals ?? (Number.isInteger(amount) ? 0 : 2);
    const formatted = amount.toFixed(dec);
    return config.position === 'before'
      ? `${config.symbol}${formatted}`
      : `${formatted}${config.symbol}`;
  };

  return { ...config, formatPrice };
};
