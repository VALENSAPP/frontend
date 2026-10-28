const React = require('react');
const renderer = require('react-test-renderer');
let mockOwner = 'account-1';
let mockAppStateListener;
const mockRemove = jest.fn();
jest.mock('react-native', () => ({ AppState: {
  addEventListener: jest.fn((event, listener) => {
    mockAppStateListener = listener;
    return { remove: mockRemove };
  }),
} }), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(mockOwner)),
}), { virtual: true });
jest.mock('../src/services/profile', () => ({ getOnboardingStatus: jest.fn() }));
const { getOnboardingStatus } = require('../src/services/profile');
const { usePagbankOnboarding } = require('../src/hooks/usePagbankOnboarding');
const { parsePagbankOnboardingStatus } = require('../src/utils/pagbankOnboarding');
const response = connected => ({ statusCode: 200, success: true, data: {
  provider: 'PAGBANK', canReceivePayments: connected, ...(connected && { accountId: 'sandbox-account' }),
} });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
global.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = renderer;

describe('PagBank connection authority', () => {
  test.each([true, false])('accepts the server connection status %s', connected => {
    expect(parsePagbankOnboardingStatus(response(connected))).toEqual({ connected });
  });
  test.each([
    undefined, {}, { connected: true },
    { ...response(true), success: false },
    { ...response(true), statusCode: 500 },
    { ...response(true), statusCode: 0 },
    { data: { provider: 'STRIPE', canReceivePayments: true, accountId: 'stripe' } },
    { data: { provider: 'PAGBANK', canReceivePayments: 'true', accountId: 'sandbox' } },
    { data: { provider: 'PAGBANK', canReceivePayments: true } },
    { data: { provider: 'PAGBANK', canReceivePayments: true, accountId: ' ' } },
  ])('rejects an unverified or failed connection %#', value => {
    expect(parsePagbankOnboardingStatus(value)).toBeNull();
  });
});

describe('PagBank status lifecycle', () => {
  let root, status;
  function Harness({ enabled = true }) { status = usePagbankOnboarding(enabled); return null; }
  async function mount(enabled = true) {
    await act(async () => { root = renderer.create(React.createElement(Harness, { enabled })); });
  }
  beforeEach(() => {
    mockOwner = 'account-1'; root = null; jest.clearAllMocks();
    getOnboardingStatus.mockReset().mockResolvedValue(response(false));
  });
  afterEach(async () => { if (root) await act(async () => root.unmount()); });

  test('does not query PagBank when another provider or screen is active', async () => {
    await mount(false);
    expect(getOnboardingStatus).not.toHaveBeenCalled();
    expect(status.connected).toBeNull();
  });
  test('rechecks the server when the app returns from the provider', async () => {
    await mount();
    expect(status.connected).toBe(false);
    getOnboardingStatus.mockResolvedValueOnce(response(true));
    await act(async () => { mockAppStateListener('active'); });
    expect(status.connected).toBe(true);
    expect(getOnboardingStatus).toHaveBeenCalledTimes(2);
  });
  test('a failed lookup is unknown and can be retried', async () => {
    getOnboardingStatus.mockRejectedValueOnce(new Error('offline'));
    await mount();
    expect(status).toMatchObject({ connected: null, error: true });
    await act(async () => { await status.refresh(); });
    expect(status).toMatchObject({ connected: false, error: false });
  });
  test('an older response cannot overwrite a newer connection check', async () => {
    await mount();
    const old = deferred(), fresh = deferred();
    getOnboardingStatus.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    let first, second;
    await act(async () => { first = status.refresh(); });
    await act(async () => { second = status.refresh(); });
    await act(async () => { fresh.resolve(response(false)); await second; });
    await act(async () => { old.resolve(response(true)); await first; });
    expect(status.connected).toBe(false);
  });
  test('does not bind the previous account response to the current account', async () => {
    const pending = deferred(); getOnboardingStatus.mockReturnValueOnce(pending.promise);
    await mount(); mockOwner = 'account-2';
    await act(async () => { pending.resolve(response(true)); });
    expect(status.connected).toBeNull();
  });
  test('disabling a screen invalidates its pending read and old refresh callback', async () => {
    const pending = deferred(); getOnboardingStatus.mockReturnValueOnce(pending.promise);
    await mount(); const oldRefresh = status.refresh;
    await act(async () => { root.update(React.createElement(Harness, { enabled: false })); });
    await act(async () => { pending.resolve(response(true)); await oldRefresh(); });
    expect(status.connected).toBeNull();
    expect(getOnboardingStatus).toHaveBeenCalledTimes(1);
  });
  test('does not publish a result after unmount', async () => {
    await mount();
    const pending = deferred(); getOnboardingStatus.mockReturnValueOnce(pending.promise);
    let read;
    await act(async () => { read = status.refresh(); });
    await act(async () => root.unmount()); root = null;
    let result;
    await act(async () => { pending.resolve(response(true)); result = await read; });
    expect(result).toBeNull();
    expect(mockRemove).toHaveBeenCalled();
  });
});
