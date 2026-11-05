import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { kycStatus } from '../services/kycverification';
import { navigate as rootNavigate } from '../navigations/RootNavigation';
import { showToastMessage } from '../components/displaytoastmessage';

export const PENDING_KYC_STATUSES = new Set([
  'PENDING',
  'SUBMITTED',
  'IN_PROGRESS',
  'PROCESSING',
  'UNDER_REVIEW',
  'WAITING',
]);

export const extractKycStatusString = (response) => {
  if (!response) return '';
  const raw =
    response?.data?.status ??
    response?.data?.kycStatus ??
    response?.status ??
    response?.kycStatus ??
    response?.data?.data?.status ??
    '';
  return String(raw).trim().toUpperCase();
};

/**
 * Fetch KYC status for a user.
 * @param {string} [providedUserId]
 * @returns {Promise<{ status: string, isApproved: boolean, isPending: boolean, isRejected: boolean }>}
 */
export const checkKycStatus = async (providedUserId) => {
  try {
    const userId = providedUserId || (await AsyncStorage.getItem('userId'));
    if (!userId) {
      return { status: '', isApproved: false, isPending: false, isRejected: true };
    }

    const response = await kycStatus(userId);
    const status = extractKycStatusString(response);
    const isApproved = status === 'APPROVED';
    const isPending = PENDING_KYC_STATUSES.has(status);
    const isRejected = !isApproved && !isPending;

    return { status, isApproved, isPending, isRejected };
  } catch (error) {
    const status = extractKycStatusString(error?.response);
    const isPending = PENDING_KYC_STATUSES.has(status);
    return {
      status: status || 'ERROR',
      isApproved: false,
      isPending,
      isRejected: !isPending,
      error,
    };
  }
};

/**
 * Checks KYC before executing any payment API.
 * - If APPROVED: returns true (caller proceeds with payment API).
 * - If PENDING: shows in-progress message and returns false.
 * - If REJECTED / not approved: shows prompt with "Complete KYC" button and returns false.
 *
 * @param {object} [options]
 * @param {string} [options.userId]
 * @param {object} [options.navigation]
 * @param {object} [options.toast]
 * @param {Function} [options.t]
 * @param {Function} [options.onNavigateKyc]
 * @returns {Promise<boolean>}
 */
export const ensureKycApprovedForPayment = async ({
  userId,
  navigation,
  toast,
  t,
  onNavigateKyc,
} = {}) => {
  const { status, isApproved, isPending } = await checkKycStatus(userId);

  if (isApproved) {
    return true;
  }

  const translate = typeof t === 'function' ? t : (k, fallback) => fallback;

  if (isPending) {
    const title = translate('kyc.progressTitle', 'KYC Verification in Progress');
    const message = translate(
      'kyc.pendingPaymentMsg',
      'Your KYC verification is in progress. Please wait for approval before making payments.',
    );

    if (toast) {
      showToastMessage(toast, 'warning', message);
    } else {
      Alert.alert(title, message, [{ text: translate('common.ok', 'OK') }]);
    }
    return false;
  }

  // Rejected / Not completed
  const title = translate('verification.kycTitle', 'KYC Verification Required');
  const isExplicitlyRejected = status === 'REJECTED' || status === 'DECLINED' || status === 'FAILED';
  const message = isExplicitlyRejected
    ? translate(
        'kyc.kycRejectedMessage',
        'Your KYC was rejected. Please complete your KYC verification to proceed with payments.',
      )
    : translate(
        'kyc.requiredForPayment',
        'Please complete your KYC verification to proceed with payments.',
      );

  const goToKyc = () => {
    if (typeof onNavigateKyc === 'function') {
      onNavigateKyc();
    } else if (navigation?.navigate) {
      navigation.navigate('kycverify');
    } else {
      rootNavigate('kycverify');
    }
  };

  Alert.alert(
    title,
    message,
    [
      { text: translate('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: translate('kyc.completeKycButton', 'Complete KYC'),
        onPress: goToKyc,
      },
    ],
    { cancelable: true },
  );

  return false;
};
