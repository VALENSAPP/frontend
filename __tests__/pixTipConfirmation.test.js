const React = require('react');
const renderer = require('react-test-renderer');
const mockTranslations = { en: require('../src/i18n/en.json'), pt: require('../src/i18n/pt.json') };
let mockLanguage = 'en';
const mockDispatch = jest.fn();
jest.mock('react-native', () => ({
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'ScrollView', 'Modal',
    'TouchableOpacity', 'KeyboardAvoidingView', 'ActivityIndicator'].map(name => [name, name])),
  StyleSheet: { create: styles => styles }, Platform: { OS: 'android' },
}), { virtual: true });
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon', { virtual: true });
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }), { virtual: true });
jest.mock('react-native-toast-notifications', () => ({ useToast: () => ({}) }), { virtual: true });
jest.mock('../src/components/displaytoastmessage', () => ({ showToastMessage: jest.fn() }));
jest.mock('../src/services/stirpe', () => ({ sendTip: jest.fn() }));
jest.mock('../src/services/paymentProfile', () => ({ getPaymentProfile: async () => ({ country: 'BR' }) }));
jest.mock('../src/theme/useApptheme', () => ({ useAppTheme: () => ({}) }));
jest.mock('../src/theme/ThemeContext', () => ({ useThemeContext: () => ({ isDarkMode: false }) }));
jest.mock('../src/i18n', () => ({
  useLanguage: () => ({ currentLanguage: mockLanguage,
    t: key => key.split('.').reduce((value, part) => value[part], mockTranslations[mockLanguage]) }),
}));
jest.mock('../src/components/modals/PixPaymentModal', () => 'PixPaymentModal');
const { sendTip } = require('../src/services/stirpe');
const { showToastMessage } = require('../src/components/displaytoastmessage');
const BrazilTipSupportModal = require('../src/components/modals/BrazilTipSupportModal').default;

global.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = renderer;
const checkout = amountMinor => ({ statusCode: 201, data: {
  provider: 'PAGBANK', paymentId: 'pix-test', orderId: 'order-test', currency: 'BRL',
  amountMinor, pixCopyPaste: 'fixture-not-payable', expiresAt: '2099-01-01T00:00:00.000Z',
} });

describe('Brazil PIX confirmation and amount entry', () => {
  let root;
  beforeEach(() => {
    mockLanguage = 'en';
    root = null;
    jest.clearAllMocks();
    sendTip.mockResolvedValue(checkout(500));
  });
  afterEach(async () => { if (root) await act(async () => root.unmount()); });
  async function mount(props = {}) {
    await act(async () => {
      root = renderer.create(React.createElement(BrazilTipSupportModal,
        { visible: true, vendorId: 'creator-test', ...props }));
    });
  }
  async function confirm() {
    await act(async () => { await root.root.findByProps({ testID: 'tip-confirm-payment' }).props.onPress(); });
  }

  test.each([['en', 'Payment confirmed'], ['pt', 'Pagamento confirmado']])(
    'shows the payment confirmation in %s and notifies the recipient once', async (locale, message) => {
      mockLanguage = locale;
      const onTipSuccess = jest.fn();
      const onClose = jest.fn();
      await mount({ onTipSuccess, onClose });
      await act(async () => root.root.findByProps({ testID: 'tip-amount-5' }).props.onPress());
      await confirm();
      const onPaid = root.root.findByType('PixPaymentModal').props.onPaid;
      await act(async () => onPaid('different-payment'));
      expect(onTipSuccess).not.toHaveBeenCalled();
      expect(showToastMessage).not.toHaveBeenCalled();
      await act(async () => { onPaid('pix-test'); onPaid('pix-test'); });
      expect(onTipSuccess).toHaveBeenCalledTimes(1);
      expect(onTipSuccess).toHaveBeenCalledWith({
        provider: 'PAGBANK', paymentId: 'pix-test', receiverUserId: 'creator-test',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(showToastMessage).toHaveBeenCalledWith(expect.anything(), 'success', message, 4000);
    },
  );
  test('submits a comma-decimal amount with exactly the selected minor units', async () => {
    mockLanguage = 'pt';
    sendTip.mockResolvedValueOnce(checkout(550));
    await mount();
    await act(async () => root.root.findByType('TextInput').props.onChangeText('5,50'));
    await confirm();
    expect(sendTip).toHaveBeenCalledWith({ amount: 5.5, receiverUserId: 'creator-test' });
    expect(root.root.findByType('PixPaymentModal').props.checkout.amountMinor).toBe(550);
  });
  test('does not submit a value that would need cent rounding', async () => {
    await mount();
    await act(async () => root.root.findByType('TextInput').props.onChangeText('5.555'));
    expect(root.root.findByProps({ testID: 'tip-confirm-payment' }).props.disabled).toBe(true);
    await confirm();
    expect(sendTip).not.toHaveBeenCalled();
  });
});
