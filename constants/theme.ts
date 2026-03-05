/**
 * Homeopathy Chatbot Theme
 *
 * Design Philosophy: Warm, nurturing, natural, and trustworthy
 * Target audience: Moms learning about homeopathy for their families
 */

import { DefaultTheme } from '@react-navigation/native';
import { Platform, PixelRatio } from 'react-native';

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
  /** Apple's continuous corner curve (squircle). Apply alongside borderRadius. */
  continuous: 'continuous' as const,
};

// =============================================================================
// SHADOWS - Soft and diffused
// =============================================================================

export const Shadows = {
  sm: {
    boxShadow: '0px 2px 8px rgba(61, 57, 53, 0.06)',
    borderCurve: 'continuous' as const,
  },
  md: {
    boxShadow: '0px 4px 16px rgba(61, 57, 53, 0.08)',
    borderCurve: 'continuous' as const,
  },
  lg: {
    boxShadow: '0px 8px 32px rgba(61, 57, 53, 0.10)',
    borderCurve: 'continuous' as const,
  },
  glow: {
    boxShadow: '0px 0px 20px rgba(123, 160, 133, 0.15)',
    borderCurve: 'continuous' as const,
  },
};

// =============================================================================
// TYPOGRAPHY - With Accessibility Support
// =============================================================================

/**
 * Base font sizes (before accessibility scaling)
 */
const BaseFontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

/**
 * Get the user's font scale from accessibility settings.
 * Capped at 2.0x to prevent extreme scaling that breaks layouts.
 */
function getFontScale(): number {
  const fontScale = PixelRatio.getFontScale();
  return Math.min(fontScale, 2.0);
}

/**
 * Typography with dynamic font scaling based on user accessibility settings.
 * Font sizes automatically adjust to the user's system preferences.
 */
export const Typography = {
  // Font sizes - Scaled based on user's accessibility settings
  get xs() { return Math.round(BaseFontSizes.xs * getFontScale()); },
  get sm() { return Math.round(BaseFontSizes.sm * getFontScale()); },
  get base() { return Math.round(BaseFontSizes.base * getFontScale()); },
  get lg() { return Math.round(BaseFontSizes.lg * getFontScale()); },
  get xl() { return Math.round(BaseFontSizes.xl * getFontScale()); },
  get '2xl'() { return Math.round(BaseFontSizes['2xl'] * getFontScale()); },
  get '3xl'() { return Math.round(BaseFontSizes['3xl'] * getFontScale()); },

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
