import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import messaging from '@react-native-firebase/messaging';
import axiosinstance from '../index';

// Kept in its own file (not services/authentication/index.js) so
// utils/accountSession.js can import it without an import cycle.

const readDeviceId = async () => {
    try {
        const id = DeviceInfo.getUniqueId ? await DeviceInfo.getUniqueId() : null;
        if (id) return String(id);
    } catch (_e) {}
    const stored = (await AsyncStorage.getItem('device_id')) || (await AsyncStorage.getItem('deviceId'));
    return stored ? String(stored) : '';
};

const readFcmToken = async () => {
    const stored = await AsyncStorage.getItem('fcmToken');
    if (stored) return stored;
    try {
        // Not saved yet (e.g. first login before notification permission):
        // ask Firebase directly. Fails harmlessly if push isn't set up yet.
        const token = await messaging().getToken();
        if (token) {
            await AsyncStorage.setItem('fcmToken', token);
            return token;
        }
    } catch (_e) {}
    return '';
};

/**
 * POST /auth/device-accounts/add — add the logged-in account to this device.
 *
 * Login and register no longer do this themselves, so it must be called after
 * every successful login/register, once the new access token is saved (the
 * axios interceptor sends it as the Authorization header). If the account is
 * already on the device the API returns alreadyAdded: true. Returns the
 * accounts saved on this device.
 */
export const addAccountToDevice = async () => {
    const deviceId = await readDeviceId();
    if (!deviceId) {
        throw new Error('Device ID not available');
    }
    const [fcmToken, savedLanguage] = await Promise.all([
        readFcmToken(),
        AsyncStorage.getItem('language'),
    ]);
    return axiosinstance.post('/auth/device-accounts/add', {
        deviceId,
        fcmToken: fcmToken || '',
        platform: Platform.OS,
        language: savedLanguage || 'en',
    });
};
