/**
 * Web-compatible alert/confirm utilities.
 *
 * On native: uses React Native's Alert.alert with button options.
 * On web: uses window.confirm / window.alert (Alert.alert doesn't support buttons on web).
 */

import { Alert, Platform } from 'react-native';

/**
 * Show a confirmation dialog with Cancel / Confirm buttons.
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: {
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  },
) {
  const { confirmText = 'OK', cancelText = 'Cancel', destructive = false } = options ?? {};

  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  }
}

/**
 * Show a simple informational alert (single OK button).
 */
export function alert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
}
