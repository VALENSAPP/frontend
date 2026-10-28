jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

jest.mock('../i18n', () => ({
  getActiveLanguage: () => 'en',
}));

const { currencyForPaymentProvider, formatProviderAmount } = require('./paymentCurrency');
const { formatDisplayCurrency } = require('./displayLocale');

describe('payment provider currency sign', () => {
  test('membership amounts stay in dollars unless the account is PagBank', () => {
    expect(formatProviderAmount(9.9, 'STRIPE')).toBe('$9.90');
    expect(formatProviderAmount(9.9, '')).toBe('$9.90');
    expect(formatProviderAmount(95, 'STRIPE')).toBe('$95.00');
    expect(formatProviderAmount(9.9, 'PAGBANK')).toBe('R$9.90');
  });

  test('PagBank uses reais and every other provider uses dollars', () => {
    expect(currencyForPaymentProvider('PAGBANK')).toBe('BRL');
    expect(currencyForPaymentProvider('pagbank')).toBe('BRL');
    expect(currencyForPaymentProvider('STRIPE')).toBe('USD');
    expect(currencyForPaymentProvider('')).toBe('USD');
    expect(currencyForPaymentProvider(null)).toBe('USD');
  });

  test('Portuguese UI shows R$ for PagBank and $ for Stripe without converting the amount', () => {
    expect(formatDisplayCurrency(20959.82, 'pt', 'PAGBANK').replace(/\s/g, ' ')).toBe('R$ 20.959,82');
    expect(formatDisplayCurrency(20959.82, 'pt', 'STRIPE').replace(/\s/g, ' ')).toBe('$ 20.959,82');
    expect(formatDisplayCurrency(707, 'pt', 'STRIPE').replace(/\s/g, ' ')).toBe('$ 707,00');
  });

  test('English UI keeps the dollar sign for Stripe and reais for PagBank', () => {
    expect(formatDisplayCurrency(20959.82, 'en', 'STRIPE')).toBe('$20,959.82');
    expect(formatDisplayCurrency(20959.82, 'en', 'PAGBANK')).toBe('R$20,959.82');
  });
});
