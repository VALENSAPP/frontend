const {
  formatMembershipAmount,
  getMembershipPlan,
  isBrazilianDocumentCountry,
  membershipCurrencyCode,
  readDocumentCountry,
} = require('./membershipPricing');

describe('Valens membership pricing by KYC document', () => {
  test('American and other non-Brazilian documents pay 9.90 dollars', () => {
    expect(isBrazilianDocumentCountry('US')).toBe(false);
    expect(isBrazilianDocumentCountry('')).toBe(false);
    expect(membershipCurrencyCode('US')).toBe('usd');
    expect(formatMembershipAmount(9.9, 'US')).toBe('$9.90');
    expect(getMembershipPlan('monthly', 'US')).toMatchObject({ price: 9.9, currency: 'usd' });
  });

  test('only a Brazilian document pays 14.90 reais per month', () => {
    expect(isBrazilianDocumentCountry('BR')).toBe(true);
    expect(isBrazilianDocumentCountry('Brazil')).toBe(true);
    expect(membershipCurrencyCode('BR')).toBe('brl');
    expect(formatMembershipAmount(14.9, 'BR')).toBe('R$14.90');
    expect(getMembershipPlan('monthly', 'BR')).toMatchObject({ price: 14.9, currency: 'brl' });
  });

  test('reads the document country from KYC payload fields', () => {
    expect(readDocumentCountry({ documentCountry: 'US', country: 'BR' })).toBe('US');
    expect(readDocumentCountry({ kyc: { country: 'BR' } })).toBe('BR');
    expect(readDocumentCountry({ country: null })).toBe('');
  });
});
