import { formatBrlAmount, getPaymentProvider } from './pixPayment';

export function getTipSupportAmount(response) {
  if (response?.success === false || Number(response?.statusCode) >= 400) return null;
  const data = response?.data;
  const raw = data?.totalTipEarning ?? data?.data?.totalTipEarning ??
    data?.totalAmount ?? data?.data?.totalAmount ??
    data?.amount ?? data?.data?.amount ??
    data?.totalSupportReceived ?? data?.data?.totalSupportReceived;
  if (raw == null || raw === '') return null;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

export function formatTipSupportAmount(amount, country, language) {
  // The API total is in major units. Use the displayed profile's country,
  // never the viewer's language or location, to select BRL presentation.
  if (getPaymentProvider({ country }) === 'PAGBANK') return formatBrlAmount(amount, language);
  return `$ ${amount.toFixed(2)}`;
}
