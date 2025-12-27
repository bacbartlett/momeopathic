/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Chat-specific colors - Dark theme focused
export const ChatColors = {
  // Backgrounds
  background: '#0D0D0F',
  headerBackground: '#141416',
  composerBackground: '#141416',
  inputBackground: '#1E1E22',
  drawerBackground: '#0D0D0F',
  drawerItemBackground: '#1A1A1E',
  drawerItemHover: '#242428',

  // Text
  text: '#EAEAEC',
  textMuted: '#8E8E93',
  textSecondary: '#A1A1A6',
  placeholder: '#5C5C61',

  // Message bubbles
  userBubble: '#2563EB',
  userText: '#FFFFFF',
  assistantBubble: '#27272A',
  assistantText: '#EAEAEC',

  // Interactive elements
  sendButton: '#2563EB',
  sendButtonDisabled: '#27272A',
  sendButtonIcon: '#FFFFFF',
  sendButtonIconDisabled: '#5C5C61',

  // Accents
  accent: '#2563EB',
  accentHover: '#1D4ED8',
  danger: '#EF4444',

  // Borders
  border: '#27272A',
  borderLight: '#1E1E22',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
