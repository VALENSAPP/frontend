/**
 * @format
 */

import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { Text } from 'react-native';
import { registerBackgroundHandler } from './src/services/NotificationService';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

// Global error protection to prevent abrupt crashes from uncaught runtime exceptions
if (typeof global !== 'undefined' && global.ErrorUtils && typeof global.ErrorUtils.getGlobalHandler === 'function') {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.warn('[GlobalErrorHandler] Handled exception:', error?.message || error);
    if (__DEV__ && originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
registerBackgroundHandler();   
AppRegistry.registerComponent(appName, () => App);
