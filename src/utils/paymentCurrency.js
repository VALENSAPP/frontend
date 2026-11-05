import AsyncStorage from '@react-native-async-storage/async-storage';

export const PAYMENT_PROVIDER_STORAGE_KEY = 'paymentProvider';
export const USER_COUNTRY_STORAGE_KEY = 'userCountry';

const BRAZIL_CODES = new Set(['BR', 'BRA', 'BRAZIL', 'BRASIL']);

let activePaymentProvider = '';
let activeUserCountry = '';

export const isBrazilianCountry = (country = activeUserCountry) =>
  BRAZIL_CODES.has(String(country || '').trim().toUpperCase());

export const normalizePaymentProvider = (provider) =>
  String(provider || '').trim().toUpperCase();

export const isPagbankProvider = (provider = activePaymentProvider) =>
  normalizePaymentProvider(provider) === 'PAGBANK';

/**
 * Currency determination:
 * Brazil accounts (or PagBank provider) use BRL (R$).
 * Every other provider/country uses USD ($).
 */
export const currencyForPaymentProvider = (provider = activePaymentProvider, country = activeUserCountry) => {
  const resolvedCountry = country || (isBrazilianCountry(provider) ? provider : activeUserCountry);
  if (isBrazilianCountry(resolvedCountry) || isPagbankProvider(provider)) {
    return 'BRL';
  }
  return 'USD';
};

/**
 * Membership prices and amounts:
 * Brazil accounts and PagBank use the R$ symbol.
 * Other accounts use the $ symbol.
 */
export const formatProviderAmount = (value, paymentProvider = activePaymentProvider, country = activeUserCountry) => {
  const amount = (Number(value) || 0).toFixed(2);
  const currency = currencyForPaymentProvider(paymentProvider, country);
  return currency === 'BRL' ? `R$${amount}` : `$${amount}`;
};

export const setActivePaymentProvider = (provider) => {
  activePaymentProvider = normalizePaymentProvider(provider);
  return activePaymentProvider;
};

export const getActivePaymentProvider = () => activePaymentProvider;

export const setActiveUserCountry = (country) => {
  activeUserCountry = String(country || '').trim().toUpperCase();
  return activeUserCountry;
};

export const getActiveUserCountry = () => activeUserCountry;

export const readPaymentProvider = (source) => {
  if (!source || typeof source !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(source, 'paymentProvider')) {
    return source.paymentProvider;
  }
  if (source.user && Object.prototype.hasOwnProperty.call(source.user, 'paymentProvider')) {
    return source.user.paymentProvider;
  }
  return undefined;
};

export const readUserCountry = (source) => {
  if (!source || typeof source !== 'object') return undefined;
  if (source.country != null && String(source.country).trim() !== '') {
    return String(source.country).trim();
  }
  if (source.user && source.user.country != null && String(source.user.country).trim() !== '') {
    return String(source.user.country).trim();
  }
  if (source.data && source.data.country != null && String(source.data.country).trim() !== '') {
    return String(source.data.country).trim();
  }
  if (source.data?.user && source.data.user.country != null && String(source.data.user.country).trim() !== '') {
    return String(source.data.user.country).trim();
  }
  return undefined;
};

export const persistPaymentProvider = async (provider) => {
  const normalized = setActivePaymentProvider(provider);
  try {
    if (!normalized) {
      await AsyncStorage.removeItem(PAYMENT_PROVIDER_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(PAYMENT_PROVIDER_STORAGE_KEY, normalized);
    }
  } catch (error) {
  }
  return normalized;
};

export const persistUserCountry = async (country) => {
  const normalized = setActiveUserCountry(country);
  try {
    if (!normalized) {
      await AsyncStorage.multiRemove([USER_COUNTRY_STORAGE_KEY, 'country']);
    } else {
      await AsyncStorage.multiSet([
        [USER_COUNTRY_STORAGE_KEY, normalized],
        ['country', normalized],
      ]);
    }
  } catch (error) {
    console.log('persistUserCountry failed', error?.message || error);
  }
  return normalized;
};

export const hydratePaymentProvider = async () => {
  try {
    const [storedProvider, storedCountry, legacyCountry] = await Promise.all([
      AsyncStorage.getItem(PAYMENT_PROVIDER_STORAGE_KEY),
      AsyncStorage.getItem(USER_COUNTRY_STORAGE_KEY),
      AsyncStorage.getItem('country'),
    ]);
    if (storedProvider) setActivePaymentProvider(storedProvider);
    if (storedCountry || legacyCountry) setActiveUserCountry(storedCountry || legacyCountry);
  } catch (error) {
  }
  return getActivePaymentProvider();
};

export const hydrateUserCountry = async () => {
  try {
    const [storedCountry, legacyCountry] = await Promise.all([
      AsyncStorage.getItem(USER_COUNTRY_STORAGE_KEY),
      AsyncStorage.getItem('country'),
    ]);
    if (storedCountry || legacyCountry) setActiveUserCountry(storedCountry || legacyCountry);
  } catch (error) {
    console.log('hydrateUserCountry failed', error?.message || error);
  }
  return getActiveUserCountry();
};

export const clearPaymentProvider = async () => {
  await Promise.all([
    persistPaymentProvider(''),
    persistUserCountry(''),
  ]);
};
