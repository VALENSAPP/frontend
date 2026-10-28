import AsyncStorage from '@react-native-async-storage/async-storage';

export const PAYMENT_PROVIDER_STORAGE_KEY = 'paymentProvider';

let activePaymentProvider = '';

export const normalizePaymentProvider = (provider) =>
  String(provider || '').trim().toUpperCase();

export const isPagbankProvider = (provider = activePaymentProvider) =>
  normalizePaymentProvider(provider) === 'PAGBANK';

/** PagBank balances are shown in reais. Every other provider is shown in dollars. */
export const currencyForPaymentProvider = (provider = activePaymentProvider) =>
  isPagbankProvider(provider) ? 'BRL' : 'USD';

/** Membership prices are dollar amounts. Only PagBank accounts use the reais sign. */
export const formatProviderAmount = (value, paymentProvider = activePaymentProvider) => {
  const amount = (Number(value) || 0).toFixed(2);
  return isPagbankProvider(paymentProvider) ? `R$${amount}` : `$${amount}`;
};

export const setActivePaymentProvider = (provider) => {
  activePaymentProvider = normalizePaymentProvider(provider);
  return activePaymentProvider;
};

export const getActivePaymentProvider = () => activePaymentProvider;

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

export const persistPaymentProvider = async (provider) => {
  const normalized = setActivePaymentProvider(provider);
  try {
    if (!normalized) {
      await AsyncStorage.removeItem(PAYMENT_PROVIDER_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(PAYMENT_PROVIDER_STORAGE_KEY, normalized);
    }
  } catch (error) {
    console.log('persistPaymentProvider failed', error?.message || error);
  }
  return normalized;
};

export const hydratePaymentProvider = async () => {
  try {
    const stored = await AsyncStorage.getItem(PAYMENT_PROVIDER_STORAGE_KEY);
    if (stored) setActivePaymentProvider(stored);
  } catch (error) {
    console.log('hydratePaymentProvider failed', error?.message || error);
  }
  return getActivePaymentProvider();
};

export const clearPaymentProvider = async () => persistPaymentProvider('');
