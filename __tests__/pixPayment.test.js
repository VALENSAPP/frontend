import { formatPixAmount, getPaymentProvider, getPixCheckout, getPixPaymentState } from '../src/utils/pixPayment';

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
  test('preserves a persisted PagBank provider when country is missing', () => {
    expect(getPaymentProvider({ paymentProvider: 'PAGBANK' })).toBe('PAGBANK');
  });
  test('keeps the Stripe route for a non-Brazilian Stripe user', () => {
    expect(getPaymentProvider({ country: 'IN', paymentProvider: 'STRIPE' })).toBe('STRIPE');
  });
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
});
