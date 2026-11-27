import AsyncStorage from '@react-native-async-storage/async-storage';
import { addAccountToDevice } from '../services/authentication/deviceAccounts';

export const SAVED_ACCOUNTS_KEY = 'savedAccounts';
export const ADDING_ACCOUNT_FLAG_KEY = 'isAddingAccount';

const SESSION_FIELDS = [
  'token',
  'refreshToken',
  'userId',
  'username',
  'email',
  'profile',
  'walletAddress',
  'walletPrivateKey',
  'walletMnemonic',
  'stripeCustomerId',
  'firebaseToken',
  'walletChainId',
  'walletType',
];

const parseSavedAccounts = raw => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const getSavedAccounts = async () => {
  const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
  return parseSavedAccounts(raw);
};

export const getCurrentSessionFromStorage = async () => {
  const pairs = await AsyncStorage.multiGet(SESSION_FIELDS);
  const session = pairs.reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (!session.userId || !session.token) {
    return null;
  }

  return {
    ...session,
    displayName: session.username || session.email || `Account ${session.userId}`,
    lastUsedAt: new Date().toISOString(),
  };
};

export const saveOrUpdateAccount = async account => {
  if (!account?.userId || !account?.token) {
    return;
  }

  const accounts = await getSavedAccounts();
  const index = accounts.findIndex(
    item => String(item.userId) === String(account.userId),
  );

  const normalized = {
    ...account,
    displayName:
      account.displayName || account.username || account.email || `Account ${account.userId}`,
    lastUsedAt: account.lastUsedAt || new Date().toISOString(),
  };

  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...normalized };
  } else {
    accounts.push(normalized);
  }

  await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const ensureCurrentAccountSaved = async overrides => {
  const current = await getCurrentSessionFromStorage();
  if (!current) return;
  await saveOrUpdateAccount({ ...current, ...(overrides || {}) });

  // Every login/register path (including "Add account") calls this once the
  // new access token is stored. Login/register no longer add the account to
  // the device on the server, so register it here. Safe to repeat: an account
  // already on the device comes back with alreadyAdded: true. Never blocks
  // login if it fails.
  try {
    // API errors come back as a resolved body (the axios interceptor never
    // rejects), so check the result as well as catching network errors.
    const result = await addAccountToDevice();
    if (result?.success === false || Number(result?.statusCode) >= 400) {
      console.warn('[accountSession] add account to device rejected:', result?.message || result?.statusCode);
    }
  } catch (error) {
    console.warn('[accountSession] add account to device failed:', error?.message);
  }
};

export const applyAccountSession = async account => {
  if (!account?.userId || !account?.token) {
    throw new Error('Invalid account session');
  }

  const setPairs = [];
  const removeKeys = [];

  SESSION_FIELDS.forEach(key => {
    const value = account[key];
    if (value === null || value === undefined || value === '') {
      removeKeys.push(key);
    } else {
      setPairs.push([key, String(value)]);
    }
  });

  if (setPairs.length) {
    await AsyncStorage.multiSet(setPairs);
  }
  if (removeKeys.length) {
    await AsyncStorage.multiRemove(removeKeys);
  }

  await AsyncStorage.setItem('isLoggedIn', 'true');
  await saveOrUpdateAccount({ ...account, lastUsedAt: new Date().toISOString() });
};

export const removeSavedAccount = async userId => {
  if (!userId) return;
  const accounts = await getSavedAccounts();
  const id = String(userId);
  const next = accounts.filter(item => String(item.userId) !== id);
  await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
};

export const clearSavedAccounts = async () => {
  await AsyncStorage.removeItem(SAVED_ACCOUNTS_KEY);
};
