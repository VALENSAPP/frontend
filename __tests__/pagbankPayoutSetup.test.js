const React = require('react');
const renderer = require('react-test-renderer');
const mockTranslations = { en: require('../src/i18n/en.json'), pt: require('../src/i18n/pt.json') };
let mockLanguage = 'pt';
let mockProvider = 'PAGBANK';
const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'ScrollView', 'Modal',
    'FlatList', 'TouchableOpacity', 'ActivityIndicator'].map(name => [name, name])),
  StyleSheet: { create: styles => styles }, Platform: { OS: 'android' },
  Alert: { alert: mockAlert }, Linking: { openURL: jest.fn() },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}), { virtual: true });
jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(), open: jest.fn(),
}), { virtual: true });
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon', { virtual: true });
jest.mock('react-native-image-picker', () => ({}), { virtual: true });
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('account-1')),
}), { virtual: true });
jest.mock('../src/services/profile', () => ({
  getOnboardingStatus: jest.fn(), createOnboardingLink: jest.fn(),
}));
jest.mock('../src/utils/paymentCurrency', () => ({
  getActivePaymentProvider: () => mockProvider,
  hydratePaymentProvider: () => Promise.resolve(mockProvider),
  isPagbankProvider: provider => provider === 'PAGBANK',
}));
jest.mock('../src/utils/tipPayoutStorage', () => ({ saveTipPayoutSetup: jest.fn(), maskAccountNumber: () => '' }));
jest.mock('../src/theme/useApptheme', () => ({ useAppTheme: () => ({ text: '#442266', card: '#ffffff', accent: '#442266' }) }));
jest.mock('../src/i18n', () => ({ useLanguage: () => ({
  t: (key, params = {}) => Object.entries(params).reduce((text, [name, value]) =>
    text.replace(`{{${name}}}`, value), key.split('.').reduce((value, part) => value[part], mockTranslations[mockLanguage])),
}) }));
const browser = require('react-native-inappbrowser-reborn');
const { getOnboardingStatus, createOnboardingLink } = require('../src/services/profile');
const { saveTipPayoutSetup } = require('../src/utils/tipPayoutStorage');
const TipPayoutSetup = require('../src/pages/wallet/TipPayoutSetup').default;
const response = connected => ({ statusCode: 200, success: true, data: {
  provider: 'PAGBANK', canReceivePayments: connected, ...(connected && { accountId: 'sandbox-account' }),
} });
global.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = renderer;

describe('PagBank payout authorization', () => {
  let root;
  const strings = () => root.root.findAllByType('Text').map(node => node.props.children).filter(value => typeof value === 'string');
  const button = text => root.root.findAllByType('TouchableOpacity').find(node =>
    node.findAllByType('Text').some(label => label.props.children === text));
  async function mount(params = {}) {
    await act(async () => { root = renderer.create(React.createElement(TipPayoutSetup, {
      navigation: { navigate: jest.fn(), canGoBack: () => true, goBack: jest.fn() }, route: { params },
    })); });
  }
  beforeEach(() => {
    root = null; mockLanguage = 'pt'; mockProvider = 'PAGBANK'; jest.clearAllMocks();
    getOnboardingStatus.mockReset().mockResolvedValue(response(false));
    createOnboardingLink.mockReset().mockResolvedValue({ statusCode: 201, data: {
      provider: 'PAGBANK', onboardingUrl: 'https://connect.sandbox.pagbank.com.br/oauth2/authorize?fixture=true',
    } });
    browser.isAvailable.mockResolvedValue(true);
    browser.open.mockResolvedValue({ type: 'cancel' });
  });
  afterEach(async () => { if (root) await act(async () => root.unmount()); });

  test('a legacy local connected flag and success route cannot bypass server verification', async () => {
    await mount({ initialStep: 'success', saved: { connected: true, bank: 'local fixture' } });
    expect(strings()).toContain('Conectar GORJETA');
    expect(strings()).not.toContain('Conta PagBank conectada');
    expect(saveTipPayoutSetup).not.toHaveBeenCalled();
  });
  test('closing the browser with authorization pending does not show success', async () => {
    await mount();
    await act(async () => { await button('Continuar').props.onPress(); });
    expect(browser.open).toHaveBeenCalledTimes(1);
    expect(getOnboardingStatus.mock.calls.length).toBeGreaterThan(1);
    expect(strings()).toContain('Conectar GORJETA');
    expect(strings()).not.toContain('Conta PagBank conectada');
    expect(saveTipPayoutSetup).not.toHaveBeenCalled();
  });
  test('only server-confirmed authorization displays the connected screen', async () => {
    await mount(); getOnboardingStatus.mockResolvedValue(response(true));
    await act(async () => { await button('Continuar').props.onPress(); });
    expect(strings()).toContain('Conta PagBank conectada');
    expect(strings()).not.toContain('local fixture');
  });
  test.each([
    ['pt', 'Não foi possível conectar ao PagBank', 'Não foi possível abrir a autorização do PagBank. Tente novamente.'],
    ['en', 'Could not connect to PagBank', 'Could not open PagBank authorization. Please try again.'],
  ])('connection errors follow the selected %s language', async (language, title, message) => {
    mockLanguage = language;
    createOnboardingLink.mockRejectedValueOnce(new Error('Backend English details'));
    await mount();
    await act(async () => { await button(language === 'pt' ? 'Continuar' : 'Continue').props.onPress(); });
    expect(mockAlert).toHaveBeenCalledWith(title, message);
    expect(browser.open).not.toHaveBeenCalled();
  });
  test('failed status verification offers a retry and never claims a connection', async () => {
    getOnboardingStatus.mockResolvedValueOnce({ statusCode: 500, message: 'unavailable' });
    await mount();
    expect(strings()).toContain('Não foi possível verificar sua conexão com o PagBank. Tente novamente.');
    await act(async () => { await button('Verificar conexão').props.onPress(); });
    expect(strings()).toContain('Conclua a autorização na página do PagBank para conectar sua conta.');
    expect(strings()).not.toContain('Conta PagBank conectada');
  });
  test('does not query PagBank or change the legacy success route for Stripe', async () => {
    mockProvider = 'STRIPE'; await mount({ initialStep: 'success', saved: { connected: true } });
    expect(getOnboardingStatus).not.toHaveBeenCalled();
    expect(strings()).toContain('GORJETA conectada!');
    expect(strings()).not.toContain('Conta PagBank conectada');
  });
});
