const React = require('react');
const renderer = require('react-test-renderer');
jest.mock('../src/services/wallet', () => ({ tipRecived: jest.fn() }));
const { tipRecived } = require('../src/services/wallet');
const { useTipSupportSummary } = require('../src/hooks/useTipSupportSummary');
const { formatTipSupportAmount, getTipSupportAmount } = require('../src/utils/tipSupportSummary');

global.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = renderer;
const response = amount => ({ statusCode: 200, data: { totalTipEarning: amount } });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

describe('support summary presentation', () => {
  test('formats Brazilian totals in major BRL units using the selected language', () => {
    expect(formatTipSupportAmount(1234.5, 'BR', 'pt')).toBe('R$ 1.234,50');
    expect(formatTipSupportAmount(1234.5, 'BR', 'en')).toBe('R$ 1,234.50');
    expect(formatTipSupportAmount(0, 'Brazil', 'pt')).toBe('R$ 0,00');
  });
  test.each(['US', 'PT', undefined])('preserves the existing summary for country %s', country => {
    expect(formatTipSupportAmount(27, country, 'pt')).toBe('$ 27.00');
  });
  test('accepts a real zero and nested legacy totals without inventing missing amounts', () => {
    expect(getTipSupportAmount(response(0))).toBe(0);
    expect(getTipSupportAmount({ data: { data: { totalSupportReceived: '27.50' } } })).toBe(27.5);
    expect(getTipSupportAmount({ statusCode: 500, data: { totalTipEarning: 0 } })).toBeNull();
    expect(getTipSupportAmount({ data: {} })).toBeNull();
    expect(getTipSupportAmount(response('invalid'))).toBeNull();
  });
});

describe('support total refresh', () => {
  let root;
  let summary;
  function Harness({ userId = 'creator-1' }) {
    summary = useTipSupportSummary(userId);
    return null;
  }
  beforeEach(() => { tipRecived.mockReset(); root = null; });
  afterEach(async () => { if (root) await act(async () => root.unmount()); });
  async function mount(userId = 'creator-1') {
    await act(async () => { root = renderer.create(React.createElement(Harness, { userId })); });
  }

  test('reads the server total again after confirmation instead of adding the tip locally', async () => {
    tipRecived.mockResolvedValueOnce(response(27)).mockResolvedValueOnce(response(34));
    await mount();
    expect(tipRecived).not.toHaveBeenCalled();
    await act(async () => { await summary.refresh(); });
    expect(summary.amount).toBe(27);
    await act(async () => { await summary.refresh(); });
    expect(summary.amount).toBe(34);
    expect(tipRecived).toHaveBeenLastCalledWith({ userId: 'creator-1' });
  });
  test('an older in-flight read cannot overwrite the refreshed total', async () => {
    const old = deferred();
    const fresh = deferred();
    tipRecived.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    await mount();
    let first;
    let second;
    await act(async () => { first = summary.refresh(); second = summary.refresh(); });
    await act(async () => { fresh.resolve(response(32)); await second; });
    expect(summary.amount).toBe(32);
    await act(async () => { old.resolve(response(27)); await first; });
    expect(summary.amount).toBe(32);
  });
  test('ignores the previous profile response after navigation', async () => {
    const pending = deferred();
    tipRecived.mockReturnValueOnce(pending.promise);
    await mount();
    let read;
    await act(async () => { read = summary.refresh(); });
    await act(async () => { root.update(React.createElement(Harness, { userId: 'creator-2' })); });
    await act(async () => { pending.resolve(response(27)); await read; });
    expect(summary.amount).toBeNull();
    tipRecived.mockResolvedValueOnce(response(12));
    await act(async () => { await summary.refresh(); });
    expect(summary.amount).toBe(12);
    expect(tipRecived).toHaveBeenLastCalledWith({ userId: 'creator-2' });
  });
  test('keeps the last known total on a read failure and allows retry', async () => {
    tipRecived.mockResolvedValueOnce(response(27))
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response(32));
    await mount();
    await act(async () => { await summary.refresh(); });
    await act(async () => { await summary.refresh(); });
    expect(summary.amount).toBe(27);
    expect(summary.error).toBe(true);
    await act(async () => { await summary.refresh(); });
    expect(summary.amount).toBe(32);
    expect(summary.error).toBe(false);
  });
  test('a failed first read is unknown, not a zero balance', async () => {
    tipRecived.mockResolvedValueOnce({ statusCode: 500 });
    await mount();
    await act(async () => { await summary.refresh(); });
    expect(summary.amount).toBeNull();
    expect(summary.error).toBe(true);
  });
  test('does not update state from a response received after unmount', async () => {
    const pending = deferred();
    tipRecived.mockReturnValueOnce(pending.promise);
    await mount();
    let read;
    await act(async () => { read = summary.refresh(); });
    await act(async () => { root.unmount(); });
    root = null;
    let updated;
    await act(async () => { pending.resolve(response(32)); updated = await read; });
    expect(updated).toBe(false);
  });
});
