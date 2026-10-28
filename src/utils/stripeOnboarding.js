/**
 * Shared Stripe onboarding and payment flow utilities.
 * Use across: Donation, Buy Credits, Subscription purchase, Subscription activation.
 */
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { Linking } from 'react-native';
import { createOnboardingLink, getOnboardingStatus, createCustomerSetupLink } from '../services/profile';

/** Re-export for single import source */
export { getOnboardingStatus, createOnboardingLink, createCustomerSetupLink };

/** Shared InAppBrowser options for payment/onboarding URLs (consistent across all flows) */
export const STRIPE_BROWSER_OPTIONS = {
  dismissButtonStyle: 'close',
  preferredBarTintColor: '#ffffff',
  preferredControlTintColor: '#000000',
  readerMode: false,
  animated: true,
  modalPresentationStyle: 'fullScreen',
  modalTransitionStyle: 'coverVertical',
  enableBarCollapsing: false,
  showTitle: true,
  toolbarColor: '#ffffff',
  secondaryToolbarColor: '#f0f0f0',
  forceCloseOnRedirection: false,
};

function firstHttpsUrl(...values) {
  for (const value of values) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Axios returns error bodies instead of rejecting. Treat only missing transport
 * and statusCode 0 as network failures. 4xx/5xx stay backend failures.
 */
export function isNetworkFailureResponse(response) {
  if (!response || typeof response !== 'object') return true;
  if (response.statusCode == null || response.statusCode === '') return false;
  const code = Number(response.statusCode);
  return !Number.isFinite(code) || code === 0;
}

export function isSuccessResponse(response) {
  if (!response || typeof response !== 'object') return false;
  if (response.error === true) return false;
  if (response.success === false) return false;
  if (typeof response.error === 'string' && response.error.trim()) return false;
  if (isNetworkFailureResponse(response)) return false;
  const code = response.statusCode;
  if (code == null || code === '') {
    if (getResponseMessage(response) && response.success !== true) return false;
    return true;
  }
  const numeric = Number(code);
  return numeric === 200 || numeric === 201;
}

export function getResponseMessage(response) {
  if (!response || typeof response !== 'object') return '';
  const candidates = [response.message, response.data?.message, response.error];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function describeRequestFailure(response, messages = STRIPE_ERROR_MESSAGES, fallbackMessage) {
  const resolvedMessages = messages || STRIPE_ERROR_MESSAGES;
  const fallback = fallbackMessage || resolvedMessages.ONBOARDING_FAILED;
  if (isNetworkFailureResponse(response)) return resolvedMessages.NETWORK_ERROR;
  return getResponseMessage(response) || fallback;
}

export function messageFromThrown(error, messages = STRIPE_ERROR_MESSAGES) {
  const resolvedMessages = messages || STRIPE_ERROR_MESSAGES;
  const apiMessage = error?.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage.trim();
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  if (!message || /^network error\.?$/i.test(message)) return resolvedMessages.NETWORK_ERROR;
  return message;
}

/**
 * Extract payment session URL from API response (handles data vs data.data).
 * Status check matches the previous payment screens: only 200 and 201.
 * @param {object} response - API response
 * @returns {string|null} sessionUrl or null
 */
export function getPaymentSessionUrl(response) {
  if (!response || (response.statusCode !== 200 && response.statusCode !== 201)) return null;
  const data = response.data || {};
  return data.sessionUrl ?? data.url ?? data.data?.sessionUrl ?? data.data?.url ?? null;
}

/**
 * Extract Stripe Connect onboarding URL from create-onboarding-link.
 * onboardingUrl is accepted as before. A generic data.url is accepted only when
 * it is a Stripe Connect link, so a checkout url cannot be treated as onboarding.
 */
export function getOnboardingUrl(response) {
  if (!response || (response.statusCode !== 200 && response.statusCode !== 201)) return null;
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  const explicit = firstHttpsUrl(
    data.onboardingUrl,
    data.data?.onboardingUrl,
    data.accountLinkUrl,
    response.onboardingUrl,
  );
  if (explicit) return explicit;
  const fallback = firstHttpsUrl(data.url, data.link, response.url);
  if (fallback && /connect\.stripe\.com/i.test(fallback)) return fallback;
  return null;
}

/**
 * Open Stripe Connect onboarding in browser. Same behavior/errors across all flows.
 * @param {object} options - { onComplete?: () => void }
 * @returns {Promise<void>}
 */
export async function openStripeOnboarding(options = {}) {
  const { onComplete, t } = options;
  const stripeErrorMessages = getStripeErrorMessages(t);
  const response = await createOnboardingLink();
  const url = getOnboardingUrl(response);
  if (!url) {
    throw new Error(describeRequestFailure(response, stripeErrorMessages, stripeErrorMessages.ONBOARDING_FAILED));
  }
  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, STRIPE_BROWSER_OPTIONS);
    } else {
      await Linking.openURL(url);
    }
    onComplete?.();
  } catch (error) {
    throw new Error(messageFromThrown(error, stripeErrorMessages));
  }
}

/** Consistent error messages for payment/onboarding flows */
export const STRIPE_ERROR_MESSAGES = {
  PAYMENT_CANCELLED: 'Payment cancelled',
  SESSION_FAILED: 'Could not create payment session. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  ONBOARDING_FAILED: 'Failed to open Stripe setup',
  RECIPIENT_NOT_READY: 'Payment recipient has not completed setup yet.',
  CUSTOMER_SETUP_REQUIRED: 'Please complete Stripe setup to add a payment method.',
  CUSTOMER_SETUP_FAILED: 'Could not open payment setup. Please try again.',
};

const STRIPE_ERROR_TRANSLATION_KEYS = {
  PAYMENT_CANCELLED: 'stripe.paymentCancelled',
  SESSION_FAILED: 'stripe.sessionFailed',
  NETWORK_ERROR: 'stripe.networkError',
  ONBOARDING_FAILED: 'stripe.onboardingFailed',
  RECIPIENT_NOT_READY: 'stripe.recipientNotReady',
  CUSTOMER_SETUP_REQUIRED: 'stripe.customerSetupRequired',
  CUSTOMER_SETUP_FAILED: 'stripe.customerSetupFailed',
};

export function getStripeErrorMessages(t) {
  const translate = typeof t === 'function'
    ? t
    : (_key, fallback) => fallback;

  return Object.entries(STRIPE_ERROR_MESSAGES).reduce((messages, [code, fallback]) => {
    messages[code] = translate(STRIPE_ERROR_TRANSLATION_KEYS[code], fallback);
    return messages;
  }, {});
}

/**
 * Open Stripe customer setup (add payment method / get stripeCustomerId).
 * Use when user.stripeCustomerId is null before any payment.
 * @param {object} options - { onComplete?: () => void }
 */
export async function openCustomerSetup(options = {}) {
  const { onComplete, t } = options;
  const stripeErrorMessages = getStripeErrorMessages(t);
  const response = await createCustomerSetupLink();
  const url = getPaymentSessionUrl(response);
  if (!url) {
    throw new Error(describeRequestFailure(response, stripeErrorMessages, stripeErrorMessages.CUSTOMER_SETUP_FAILED));
  }
  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, STRIPE_BROWSER_OPTIONS);
    } else {
      await Linking.openURL(url);
    }
    onComplete?.();
  } catch (error) {
    throw new Error(messageFromThrown(error, stripeErrorMessages));
  }
}
