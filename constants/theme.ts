/**
 * Homeopathy Chatbot Theme
 * 
 * Design Philosophy: Warm, nurturing, natural, and trustworthy
 * Target audience: Moms learning about homeopathy for their families
 */

import { DefaultTheme } from '@react-navigation/native';
import { Platform } from 'react-native';

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const Colors = {
  // Primary - Sage Green (healing, calm, natural)
  primary: '#7BA085',
  primaryLight: '#A8C5B5',
  primaryDark: '#5A7A65',
  primaryAlpha10: 'rgba(123, 160, 133, 0.1)',
  primaryAlpha20: 'rgba(123, 160, 133, 0.2)',

  // Secondary - Warm Blush/Peach (feminine, nurturing)
  secondary: '#F5E1DA',
  secondaryDark: '#E8C4B8',

  // Accent - Soft Lavender (calming)
  accent: '#D4C5E2',
  accentDark: '#B8A5CC',

  // Backgrounds - Warm Creams
  bgPrimary: '#FFFBF7',
  bgSecondary: '#FFF8F3',
  bgSurface: '#FFFFFF',

  // Text - Warm Tones (not pure black)
  textPrimary: '#3D3935',
  textSecondary: '#6B6560',
  textMuted: '#9A9590',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E8E4E0',
  borderLight: '#F0ECE8',

  // Functional
  success: '#7BA085',
  warning: '#E8B86D',
  error: '#D4847C',

  // Legacy light/dark mode support (keeping for compatibility)
  light: {
    text: '#3D3935',
    background: '#FFFBF7',
    tint: '#7BA085',
    icon: '#6B6560',
    tabIconDefault: '#9A9590',
    tabIconSelected: '#7BA085',
  },
  dark: {
    text: '#3D3935',
    background: '#FFFBF7',
    tint: '#7BA085',
    icon: '#6B6560',
    tabIconDefault: '#9A9590',
    tabIconSelected: '#7BA085',
  },
};

// =============================================================================
// CHAT-SPECIFIC COLORS
// =============================================================================

export const ChatColors = {
  // Backgrounds - Warm and inviting
  background: Colors.bgPrimary,
  headerBackground: Colors.bgSurface,
  composerBackground: Colors.bgSurface,
  inputBackground: Colors.bgSecondary,
  drawerBackground: Colors.bgSurface,
  drawerItemBackground: Colors.primaryAlpha10,
  drawerItemHover: Colors.primaryAlpha20,

  // Text
  text: Colors.textPrimary,
  textMuted: Colors.textMuted,
  textSecondary: Colors.textSecondary,
  placeholder: Colors.textMuted,

  // Message bubbles - Soft and organic
  userBubble: Colors.primary,
  userBubbleGradientStart: Colors.primaryLight,
  userBubbleGradientEnd: Colors.primary,
  userText: Colors.textInverse,
  assistantBubble: Colors.secondary,
  assistantText: Colors.textPrimary,

  // Interactive elements - Nurturing sage green
  sendButton: Colors.primary,
  sendButtonDisabled: Colors.borderLight,
  sendButtonIcon: Colors.textInverse,
  sendButtonIconDisabled: Colors.textMuted,

  // Accents
  accent: Colors.primary,
  accentHover: Colors.primaryDark,
  danger: Colors.error,

  // Borders - Soft and subtle
  border: Colors.border,
  borderLight: Colors.borderLight,
};

// =============================================================================
// SPACING
// =============================================================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// =============================================================================
// BORDER RADIUS - Generous and soft (organic shapes)
// =============================================================================

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// =============================================================================
// SHADOWS - Soft and diffused
// =============================================================================

export const Shadows = {
  sm: {
    shadowColor: '#3D3935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#3D3935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3D3935',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
};

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const Typography = {
  // Font sizes - Generous for readability
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,

  // Font weights
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Line heights - Relaxed for easy reading
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

// =============================================================================
// FONTS - Platform specific with Google Fonts
// =============================================================================

export const Fonts = Platform.select({
  ios: {
    heading: 'Quicksand-SemiBold',
    headingBold: 'Quicksand-Bold',
    body: 'Lato-Regular',
    bodyMedium: 'Lato-Bold',
    // Fallbacks
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  android: {
    heading: 'Quicksand-SemiBold',
    headingBold: 'Quicksand-Bold',
    body: 'Lato-Regular',
    bodyMedium: 'Lato-Bold',
    // Fallbacks
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'Roboto',
    mono: 'monospace',
  },
  web: {
    heading: "'Quicksand', 'Nunito', -apple-system, sans-serif",
    headingBold: "'Quicksand', 'Nunito', -apple-system, sans-serif",
    body: "'Lato', 'Source Sans Pro', -apple-system, sans-serif",
    bodyMedium: "'Lato', 'Source Sans Pro', -apple-system, sans-serif",
    // Fallbacks
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  default: {
    heading: 'normal',
    headingBold: 'normal',
    body: 'normal',
    bodyMedium: 'normal',
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

// =============================================================================
// NAVIGATION THEME
// =============================================================================

export const NavigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.bgPrimary,
    card: Colors.bgSurface,
    border: Colors.border,
    text: Colors.textPrimary,
    primary: Colors.primary,
    notification: Colors.error,
  },
};
