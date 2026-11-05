jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const {
  TOTAL_EARNINGS_HIDDEN_STORAGE_KEY,
  getCachedTotalEarningsHidden,
  setCachedTotalEarningsHidden,
  loadTotalEarningsHidden,
  persistTotalEarningsHidden,
} = require('./earningsPrivacy');

describe('earningsPrivacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCachedTotalEarningsHidden(false);
  });

  test('loadTotalEarningsHidden returns false if not set in storage', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    const result = await loadTotalEarningsHidden();
    expect(result).toBe(false);
    expect(getCachedTotalEarningsHidden()).toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(TOTAL_EARNINGS_HIDDEN_STORAGE_KEY);
  });

  test('loadTotalEarningsHidden returns true if stored as "true"', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    const result = await loadTotalEarningsHidden();
    expect(result).toBe(true);
    expect(getCachedTotalEarningsHidden()).toBe(true);
  });

  test('persistTotalEarningsHidden stores boolean string and updates cache', async () => {
    await persistTotalEarningsHidden(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TOTAL_EARNINGS_HIDDEN_STORAGE_KEY, 'true');
    expect(getCachedTotalEarningsHidden()).toBe(true);

    await persistTotalEarningsHidden(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TOTAL_EARNINGS_HIDDEN_STORAGE_KEY, 'false');
    expect(getCachedTotalEarningsHidden()).toBe(false);
  });
});
