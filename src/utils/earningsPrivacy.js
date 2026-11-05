import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOTAL_EARNINGS_HIDDEN_STORAGE_KEY = 'is_total_earnings_hidden';

let cachedTotalEarningsHidden = false;

export const getCachedTotalEarningsHidden = () => cachedTotalEarningsHidden;

export const setCachedTotalEarningsHidden = (value) => {
  cachedTotalEarningsHidden = Boolean(value);
  return cachedTotalEarningsHidden;
};

export const loadTotalEarningsHidden = async () => {
  try {
    const raw = await AsyncStorage.getItem(TOTAL_EARNINGS_HIDDEN_STORAGE_KEY);
    if (raw !== null) {
      cachedTotalEarningsHidden = raw === 'true';
    } else {
      cachedTotalEarningsHidden = false;
    }
  } catch (error) {
    console.log('loadTotalEarningsHidden error:', error);
  }
  return cachedTotalEarningsHidden;
};

export const persistTotalEarningsHidden = async (hidden) => {
  const boolVal = Boolean(hidden);
  cachedTotalEarningsHidden = boolVal;
  try {
    await AsyncStorage.setItem(TOTAL_EARNINGS_HIDDEN_STORAGE_KEY, String(boolVal));
  } catch (error) {
    console.log('persistTotalEarningsHidden error:', error);
  }
  return boolVal;
};

// Eagerly load stored setting on module load
loadTotalEarningsHidden();
