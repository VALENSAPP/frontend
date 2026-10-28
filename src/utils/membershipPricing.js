const BRAZIL_CODES = new Set(['BR', 'BRA', 'BRAZIL', 'BRASIL']);

const PLAN_COPY = {
  monthly: {
    id: 'monthly',
    periodKey: 'perMonth',
    titleKey: 'monthlyPlan',
    descKey: 'monthlyDesc',
    badgeKey: 'mostPopular',
    badgeTone: 'accent',
  },
  annual: {
    id: 'annual',
    periodKey: 'perYear',
    titleKey: 'annualPlan',
    descKey: 'annualDesc',
    badgeKey: 'save20',
    badgeTone: 'success',
  },
};

const PRICES = {
  USD: {
    currency: 'usd',
    monthly: { price: 9.9, originalPrice: null },
    annual: { price: 95, originalPrice: 118.8 },
  },
  BRL: {
    currency: 'brl',
    monthly: { price: 14.9, originalPrice: null },
    annual: { price: 143.04, originalPrice: 178.8 },
  },
};

const firstText = (...values) => {
  const found = values.find(value => value != null && String(value).trim() !== '');
  return found == null ? '' : String(found).trim();
};

export const isBrazilianDocumentCountry = (country) =>
  BRAZIL_CODES.has(String(country || '').trim().toUpperCase());

export const readDocumentCountry = (source) => {
  if (!source || typeof source !== 'object') return '';
  return firstText(
    source.documentCountry,
    source.kycCountry,
    source.idCountry,
    source.issuingCountry,
    source.countryOfIssue,
    source.docCountry,
    source.idDocCountry,
    source.nationality,
    source.idDoc?.country,
    source.kyc?.documentCountry,
    source.kyc?.country,
    source.kycData?.country,
    source.verification?.country,
    source.applicant?.info?.country,
    source.fixedInfo?.country,
    source.info?.country,
    source.country,
  );
};

export const membershipCurrencyCode = (country) =>
  isBrazilianDocumentCountry(country) ? 'brl' : 'usd';

export const formatMembershipAmount = (value, country) => {
  const amount = (Number(value) || 0).toFixed(2);
  return isBrazilianDocumentCountry(country) ? `R$${amount}` : `$${amount}`;
};

export const getMembershipPlan = (planId, country) => {
  const table = isBrazilianDocumentCountry(country) ? PRICES.BRL : PRICES.USD;
  const id = planId === 'annual' ? 'annual' : 'monthly';
  return {
    ...PLAN_COPY[id],
    ...table[id],
    currency: table.currency,
  };
};
