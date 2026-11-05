import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { kycStatus } from '../services/kycverification';
import { navigate as rootNavigate } from '../navigations/RootNavigation';
import {
  checkKycStatus,
  ensureKycApprovedForPayment,
  extractKycStatusString,
} from './kycPaymentGuard';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));

jest.mock('../services/kycverification', () => ({
  kycStatus: jest.fn(),
}));

jest.mock('../navigations/RootNavigation', () => ({
  navigate: jest.fn(),
}));

jest.mock('../components/displaytoastmessage', () => ({
  showToastMessage: jest.fn(),
}));

describe('kycPaymentGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('extractKycStatusString', () => {
    test('extracts status from different response formats', () => {
      expect(extractKycStatusString({ data: { status: 'APPROVED' } })).toBe('APPROVED');
      expect(extractKycStatusString({ data: { kycStatus: 'pending' } })).toBe('PENDING');
      expect(extractKycStatusString({ status: 'REJECTED' })).toBe('REJECTED');
      expect(extractKycStatusString(null)).toBe('');
    });
  });

  describe('checkKycStatus', () => {
    test('returns APPROVED flags', async () => {
      AsyncStorage.getItem.mockResolvedValue('user-123');
      kycStatus.mockResolvedValue({ data: { status: 'APPROVED' } });

      const res = await checkKycStatus();
      expect(res.status).toBe('APPROVED');
      expect(res.isApproved).toBe(true);
      expect(res.isPending).toBe(false);
      expect(res.isRejected).toBe(false);
      expect(kycStatus).toHaveBeenCalledWith('user-123');
    });

    test('returns PENDING flags', async () => {
      kycStatus.mockResolvedValue({ data: { status: 'SUBMITTED' } });

      const res = await checkKycStatus('user-456');
      expect(res.status).toBe('SUBMITTED');
      expect(res.isApproved).toBe(false);
      expect(res.isPending).toBe(true);
      expect(res.isRejected).toBe(false);
    });

    test('returns REJECTED flags for decline', async () => {
      kycStatus.mockResolvedValue({ data: { status: 'DECLINED' } });

      const res = await checkKycStatus('user-789');
      expect(res.status).toBe('DECLINED');
      expect(res.isApproved).toBe(false);
      expect(res.isPending).toBe(false);
      expect(res.isRejected).toBe(true);
    });
  });

  describe('ensureKycApprovedForPayment', () => {
    test('returns true when status is APPROVED and does not show alert', async () => {
      AsyncStorage.getItem.mockResolvedValue('user-123');
      kycStatus.mockResolvedValue({ data: { status: 'APPROVED' } });

      const allowed = await ensureKycApprovedForPayment();
      expect(allowed).toBe(true);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('returns false and shows wait message when status is PENDING', async () => {
      AsyncStorage.getItem.mockResolvedValue('user-123');
      kycStatus.mockResolvedValue({ data: { status: 'PENDING' } });

      const allowed = await ensureKycApprovedForPayment();
      expect(allowed).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'KYC Verification in Progress',
        expect.stringContaining('in progress'),
        expect.any(Array),
      );
    });

    test('returns false and shows Complete KYC button when status is REJECTED', async () => {
      AsyncStorage.getItem.mockResolvedValue('user-123');
      kycStatus.mockResolvedValue({ data: { status: 'REJECTED' } });

      const mockNavigation = { navigate: jest.fn() };
      const allowed = await ensureKycApprovedForPayment({ navigation: mockNavigation });
      expect(allowed).toBe(false);

      expect(Alert.alert).toHaveBeenCalled();
      const alertCall = Alert.alert.mock.calls[0];
      const buttons = alertCall[2];
      expect(buttons).toHaveLength(2);
      expect(buttons[1].text).toBe('Complete KYC');

      // Trigger button press
      buttons[1].onPress();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('kycverify');
    });

    test('falls back to root navigation when navigation is not provided', async () => {
      AsyncStorage.getItem.mockResolvedValue('user-123');
      kycStatus.mockResolvedValue({ data: { status: 'DECLINED' } });

      await ensureKycApprovedForPayment();
      const buttons = Alert.alert.mock.calls[0][2];
      buttons[1].onPress();
      expect(rootNavigate).toHaveBeenCalledWith('kycverify');
    });
  });
});
