jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(async () => false),
  open: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

jest.mock('../services/profile', () => ({
  createOnboardingLink: jest.fn(),
  getOnboardingStatus: jest.fn(),
  createCustomerSetupLink: jest.fn(),
}));

const {
  describeRequestFailure,
  getOnboardingUrl,
  getPaymentSessionUrl,
  isNetworkFailureResponse,
  messageFromThrown,
  STRIPE_ERROR_MESSAGES,
} = require('./stripeOnboarding');

describe('stripe onboarding response handling', () => {
  test('reads Connect onboardingUrl and Stripe account-link url only from a success body', () => {
    expect(getOnboardingUrl({
      statusCode: 200,
      data: { onboardingUrl: 'https://connect.stripe.com/setup/a' },
    })).toBe('https://connect.stripe.com/setup/a');

    expect(getOnboardingUrl({
      statusCode: 201,
      data: { url: 'https://connect.stripe.com/setup/b' },
    })).toBe('https://connect.stripe.com/setup/b');

    expect(getOnboardingUrl({
      statusCode: 400,
      message: 'Complete KYC before payouts',
      data: { url: 'https://connect.stripe.com/setup/hidden' },
    })).toBeNull();
  });

  test('does not treat a backend validation error as a network failure', () => {
    const validation = { statusCode: 400, message: 'Complete KYC before payouts' };
    expect(isNetworkFailureResponse(validation)).toBe(false);
    expect(describeRequestFailure(validation, STRIPE_ERROR_MESSAGES)).toBe('Complete KYC before payouts');
  });

  test('maps a missing transport response to the network message', () => {
    const network = { statusCode: 0, message: 'Network error', error: true };
    expect(isNetworkFailureResponse(network)).toBe(true);
    expect(describeRequestFailure(network, STRIPE_ERROR_MESSAGES)).toBe(STRIPE_ERROR_MESSAGES.NETWORK_ERROR);
    expect(getPaymentSessionUrl(network)).toBeNull();
  });

  test('keeps a thrown local message instead of replacing it with a network error', () => {
    expect(messageFromThrown(new Error('Complete KYC before payouts'), STRIPE_ERROR_MESSAGES))
      .toBe('Complete KYC before payouts');
    expect(messageFromThrown(new Error('Network error'), STRIPE_ERROR_MESSAGES))
      .toBe(STRIPE_ERROR_MESSAGES.NETWORK_ERROR);
  });

  test('reads a checkout url from the documented pay-following shape', () => {
    expect(getPaymentSessionUrl({
      statusCode: 200,
      data: { sessionUrl: 'https://checkout.stripe.com/c/pay/cs_test' },
    })).toBe('https://checkout.stripe.com/c/pay/cs_test');
  });
});
