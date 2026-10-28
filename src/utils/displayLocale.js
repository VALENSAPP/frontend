import { getActiveLanguage } from '../i18n';
import { currencyForPaymentProvider, getActivePaymentProvider } from './paymentCurrency';

const LOCALE_FORMAT = {
  en: { locale: 'en-US', hour12: true },
  pt: { locale: 'pt-BR', hour12: false },
  es: { locale: 'es-ES', hour12: false },
  fr: { locale: 'fr-FR', hour12: false },
  it: { locale: 'it-IT', hour12: false },
};

const formatConfig = (language = getActiveLanguage()) =>
  LOCALE_FORMAT[language] || LOCALE_FORMAT.en;

const currencyFormatOptions = (currency) => ({
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatAmountForCurrency = (amount, locale, currency) => {
  const options = currencyFormatOptions(currency);
  try {
    return amount.toLocaleString(locale, { ...options, currencyDisplay: 'narrowSymbol' });
  } catch {
    return amount.toLocaleString(locale, options);
  }
};

/** Keep the currency sign as R$ or $, even when the locale would print US$ / USD / BRL. */
const normalizeCurrencySign = (formatted, currency) => {
  if (currency === 'USD') {
    return formatted.replace(/US\$/g, '$').replace(/\$US/g, '$').replace(/USD/g, '$');
  }
  if (currency === 'BRL') {
    return formatted.replace(/BRL/g, 'R$');
  }
  return formatted;
};

export const formatDisplayCurrency = (value, language, paymentProvider) => {
  const amount = Number(value) || 0;
  const { locale } = formatConfig(language);
  const provider = paymentProvider === undefined ? getActivePaymentProvider() : paymentProvider;
  const currency = currencyForPaymentProvider(provider);
  return normalizeCurrencySign(formatAmountForCurrency(amount, locale, currency), currency);
};

export const formatDisplayNumber = (value, language) => {
  const amount = Number(value) || 0;
  const { locale } = formatConfig(language);
  return amount.toLocaleString(locale, { maximumFractionDigits: 0 });
};

export const formatDisplayDecimal = (value, language) => {
  const amount = Number(value) || 0;
  const { locale } = formatConfig(language);
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDisplayTime = (date, language) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const { locale, hour12 } = formatConfig(language);
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  });
};
