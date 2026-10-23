const BRAZIL_NAMES = new Set(['br', 'bra', 'brazil', 'brasil', 'brésil', 'bresil']);

// The new PIX UI is Brazil-only. Every other country keeps the legacy Stripe flow.
export function getPaymentProvider(user) {
  const country = String(user?.country || '').trim().toLowerCase();
  const parts = country.split(/[,|/]/).map(part => part.trim());
  if (BRAZIL_NAMES.has(country) || parts.some(part => BRAZIL_NAMES.has(part)) ||
      /\bbrazil\b|\bbrasil\b/.test(country)) return 'PAGBANK';
  return 'STRIPE';
}

export function getPixCheckout(response, expectedAmountMinor) {
  if (![200, 201].includes(response?.statusCode)) return null;
  const data = response.data;
  if (data?.provider !== 'PAGBANK' || !data.paymentId || !data.orderId ||
      String(data.currency).toUpperCase() !== 'BRL' ||
      !Number.isSafeInteger(data.amountMinor) || data.amountMinor <= 0 ||
      (expectedAmountMinor != null && data.amountMinor !== expectedAmountMinor) ||
      typeof data.pixCopyPaste !== 'string' || !data.pixCopyPaste.trim() ||
      !Number.isFinite(Date.parse(data.expiresAt))) return null;
  return data;
}

// Never interpret translated labels, a copied QR, or browser closure as payment.
export function getPixPaymentState(response, paymentId) {
  if (response?.statusCode !== 200 || response.data?.paymentId !== paymentId ||
      response.data?.paymentMethod !== 'PAGBANK') return 'UNKNOWN';
  const status = String(response.data.rawStatus || '').toLowerCase();
  if (status === 'succeeded' || status === 'completed') return 'PAID';
  if (['failed', 'canceled', 'cancelled', 'refunded'].includes(status)) return 'FAILED';
  if (status === 'expired') return 'EXPIRED';
  return status === 'pending' ? 'PENDING' : 'UNKNOWN';
}

export function parsePixAmountMinor(value) {
  const match = /^(\d+)(?:[.,](\d{0,2}))?$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function formatBrlAmount(amount, language = 'pt') {
  const locale = language === 'pt' ? 'pt-BR' : language || 'en';
  return `R$ ${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatPixAmount(amountMinor, language = 'pt') {
  return formatBrlAmount(amountMinor / 100, language);
}
