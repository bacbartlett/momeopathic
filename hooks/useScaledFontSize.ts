/**
 * Hook to scale font sizes based on user's accessibility settings
 *
 * This respects the user's system-level font size preferences,
 * which is crucial for accessibility.
 */

import { PixelRatio } from 'react-native';
import { useMemo } from 'react';

/**
 * Maximum font scale multiplier to prevent extreme scaling that breaks layouts.
 * This caps the font size at 2x the base size (200%).
 *
 * Users with fontScale > 2.0 will still get significantly larger text,
 * but we prevent extreme cases that would break the UI entirely.
 */
const MAX_FONT_SCALE = 2.0;

/**
 * Get the current font scale from the user's accessibility settings.
 * This value typically ranges from 0.85 to 3.0+ depending on the user's settings.
 *
 * @returns The font scale factor, capped at MAX_FONT_SCALE
 */
export function getFontScale(): number {
  const fontScale = PixelRatio.getFontScale();
  // Cap at maximum to prevent extreme scaling
  return Math.min(fontScale, MAX_FONT_SCALE);
}

/**
 * Hook to get a scaled font size based on user's accessibility settings.
 *
 * @param baseSize - The base font size in pixels
 * @returns The scaled font size
 *
 * @example
 * const fontSize = useScaledFontSize(16); // Base 16px
 * // If user has 1.5x font scale set, returns 24px
 */
export function useScaledFontSize(baseSize: number): number {
  return useMemo(() => {
    const scale = getFontScale();
    return Math.round(baseSize * scale);
  }, [baseSize]);
}

/**
 * Scale a font size without using a hook (useful in stylesheets).
 *
 * Note: This calculates the scale once at module load time,
 * so it won't update if font settings change while the app is running.
 * For dynamic updates, use the hook version instead.
 *
 * @param baseSize - The base font size in pixels
 * @returns The scaled font size
 */
export function scaleFontSize(baseSize: number): number {
  const scale = getFontScale();
  return Math.round(baseSize * scale);
}
