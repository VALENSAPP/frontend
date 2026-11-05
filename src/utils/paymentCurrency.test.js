jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
  multiSet: jest.fn(async () => null),
  multiRemove: jest.fn(async () => null),
}));

jest.mock('../i18n', () => ({
  getActiveLanguage: () => 'en',
}));

const {
  currencyForPaymentProvider,
  formatProviderAmount,
  isBrazilianCountry,
  readUserCountry,
  setActivePaymentProvider,
  setActiveUserCountry,
} = require('./paymentCurrency');
const { formatDisplayCurrency } = require('./displayLocale');

describe('payment provider and country currency sign', () => {
  beforeEach(() => {
    setActivePaymentProvider('');
    setActiveUserCountry('');
  });

  test('identifies Brazilian country codes and names', () => {
    expect(isBrazilianCountry('BR')).toBe(true);
    expect(isBrazilianCountry('br')).toBe(true);
    expect(isBrazilianCountry('BRA')).toBe(true);
    expect(isBrazilianCountry('Brazil')).toBe(true);
    expect(isBrazilianCountry('Brasil')).toBe(true);
    expect(isBrazilianCountry('US')).toBe(false);
    expect(isBrazilianCountry('')).toBe(false);
    expect(isBrazilianCountry(null)).toBe(false);
  });

  test('reads user country from various payload shapes', () => {
    expect(readUserCountry({ country: 'BR' })).toBe('BR');
    expect(readUserCountry({ user: { country: 'BR' } })).toBe('BR');
    expect(readUserCountry({ data: { user: { country: 'BR' } } })).toBe('BR');
    expect(readUserCountry({ data: { country: 'BR' } })).toBe('BR');
    expect(readUserCountry(null)).toBeUndefined();
  });

  test('Brazil country shows R$ even when paymentProvider is STRIPE', () => {
    expect(currencyForPaymentProvider('STRIPE', 'BR')).toBe('BRL');
    expect(currencyForPaymentProvider('STRIPE', 'Brazil')).toBe('BRL');
    expect(formatProviderAmount(9.9, 'STRIPE', 'BR')).toBe('R$9.90');
    expect(formatDisplayCurrency(20959.82, 'en', 'STRIPE', 'BR')).toBe('R$20,959.82');
    expect(formatDisplayCurrency(20959.82, 'pt', 'STRIPE', 'BR').replace(/\s/g, ' ')).toBe('R$ 20.959,82');
  });

  test('Active Brazil country profile defaults STRIPE to R$', () => {
    setActiveUserCountry('BR');
    setActivePaymentProvider('STRIPE');
    expect(currencyForPaymentProvider()).toBe('BRL');
    expect(currencyForPaymentProvider('STRIPE')).toBe('BRL');
    expect(formatProviderAmount(9.9)).toBe('R$9.90');
    expect(formatDisplayCurrency(20959.82, 'en')).toBe('R$20,959.82');
    expect(formatDisplayCurrency(20959.82, 'pt').replace(/\s/g, ' ')).toBe('R$ 20.959,82');
  });

  test('US or non-Brazil accounts stay in dollars with STRIPE', () => {
    expect(currencyForPaymentProvider('STRIPE', 'US')).toBe('USD');
    expect(formatProviderAmount(9.9, 'STRIPE', 'US')).toBe('$9.90');
    expect(formatProviderAmount(95, 'STRIPE', 'US')).toBe('$95.00');
    expect(formatDisplayCurrency(20959.82, 'en', 'STRIPE', 'US')).toBe('$20,959.82');
  });

  test('PagBank uses reais and every other provider without country uses dollars', () => {
    expect(currencyForPaymentProvider('PAGBANK')).toBe('BRL');
    expect(currencyForPaymentProvider('pagbank')).toBe('BRL');
    expect(currencyForPaymentProvider('STRIPE')).toBe('USD');
    expect(currencyForPaymentProvider('')).toBe('USD');
    expect(currencyForPaymentProvider(null)).toBe('USD');
  });

  test('Portuguese UI shows R$ for PagBank and $ for Stripe when country is not Brazil', () => {
    expect(formatDisplayCurrency(20959.82, 'pt', 'PAGBANK').replace(/\s/g, ' ')).toBe('R$ 20.959,82');
    expect(formatDisplayCurrency(20959.82, 'pt', 'STRIPE').replace(/\s/g, ' ')).toBe('$ 20.959,82');
    expect(formatDisplayCurrency(707, 'pt', 'STRIPE').replace(/\s/g, ' ')).toBe('$ 707,00');
  });

  test('English UI keeps the dollar sign for Stripe and reais for PagBank', () => {
    expect(formatDisplayCurrency(20959.82, 'en', 'STRIPE')).toBe('$20,959.82');
    expect(formatDisplayCurrency(20959.82, 'en', 'PAGBANK')).toBe('R$20,959.82');
  });
});
