import { formatPixAmount, getPaymentProvider, getPixCheckout, getPixPaymentState, parsePixAmountMinor } from '../src/utils/pixPayment';

const checkout = {
  provider: 'PAGBANK', paymentId: 'payment-1', orderId: 'order-1', currency: 'BRL',
  amountMinor: 500, pixCopyPaste: 'fixture-only-not-payable', expiresAt: '2099-01-01T00:00:00.000Z',
};
const response = data => ({ statusCode: 200, data });

describe('PIX tip checkout', () => {
  test.each(['BR', 'Brazil', 'Brasil', 'BRA', 'Brésil', 'São Paulo, Brazil'])(
    'routes %s to PagBank even when the stored provider is Stripe', country => {
      expect(getPaymentProvider({ country, paymentProvider: 'STRIPE' })).toBe('PAGBANK');
    },
  );
  test('does not enable the new UI from a stored provider without Brazil country', () => {
    expect(getPaymentProvider({ paymentProvider: 'PAGBANK' })).toBe('STRIPE');
  });
  test.each(['US', 'GB', 'PT', 'IN', 'DE', 'JP', 'ZA', 'AU', 'CA', 'FR'])(
    'preserves the existing Stripe flow for %s regardless of a stale stored provider', country => {
      expect(getPaymentProvider({ country, paymentProvider: 'STRIPE' })).toBe('STRIPE');
      expect(getPaymentProvider({ country, paymentProvider: 'PAGBANK' })).toBe('STRIPE');
    },
  );
  test('accepts a complete checkout with the requested amount', () => {
    expect(getPixCheckout(response(checkout), 500)).toBe(checkout);
    expect(formatPixAmount(500)).toBe('R$ 5,00');
  });
  test.each([
    { amountMinor: 501 }, { amountMinor: -1 }, { currency: 'USD' }, { paymentId: null },
    { orderId: null }, { pixCopyPaste: '' }, { expiresAt: 'invalid' }, { provider: 'STRIPE' },
  ])('rejects an incomplete or mismatched checkout: %j', change => {
    expect(getPixCheckout(response({ ...checkout, ...change }), 500)).toBeNull();
  });
  test('does not treat a legacy image URL as a complete PIX checkout', () => {
    expect(getPixCheckout(response({ url: 'https://example.invalid/qr.png' }), 500)).toBeNull();
  });
  test.each(['succeeded', 'completed'])('accepts the matching backend receipt: %s', rawStatus => {
    expect(getPixPaymentState(response({ paymentId: 'payment-1', paymentMethod: 'PAGBANK', rawStatus }), 'payment-1')).toBe('PAID');
  });
  test.each([
    { paymentId: 'another-payment', paymentMethod: 'PAGBANK', rawStatus: 'succeeded' },
    { paymentId: 'payment-1', paymentMethod: 'STRIPE', rawStatus: 'succeeded' },
    { paymentId: 'payment-1', paymentMethod: 'PAGBANK', status: 'Pago' },
  ])('does not confirm a different payment, provider or translated label: %j', data => {
    expect(getPixPaymentState(response(data), 'payment-1')).toBe('UNKNOWN');
  });
  test.each([['pending', 'PENDING'], ['failed', 'FAILED'], ['refunded', 'FAILED'], ['expired', 'EXPIRED']])(
    'preserves a non-successful receipt: %s', (rawStatus, expected) => {
      expect(getPixPaymentState(response({ paymentId: 'payment-1', paymentMethod: 'PAGBANK', rawStatus }), 'payment-1')).toBe(expected);
    },
  );

  test.each([['5,50', 550], ['5.50', 550], ['0,50', 50], ['5', 500], [25, 2500]])(
    'reads an exact decimal amount without rounding: %s', (input, minor) => {
      expect(parsePixAmountMinor(input)).toBe(minor);
    },
  );
  test.each(['5,555', '5.555', '1.234,56', '-5', '1e3', 'Infinity', '', '9007199254740992'])(
    'rejects ambiguous, over-precise or unsafe input: %s', input => {
      expect(parsePixAmountMinor(input)).toBeNull();
    },
  );
  test('uses the selected language to format BRL', () => {
    expect(formatPixAmount(123450, 'pt')).toBe('R$ 1.234,50');
    expect(formatPixAmount(123450, 'en')).toBe('R$ 1,234.50');
  });
});
