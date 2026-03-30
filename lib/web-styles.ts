/**
 * Shared web-specific style utilities.
 *
 * These helpers return empty objects on native, so they're safe to spread
 * into any StyleSheet without Platform checks at the call site.
 */

import { Platform, type ViewStyle } from 'react-native';

const isWeb = Platform.OS === 'web';

/** Max-width for form containers (sign-in, join) */
export const WEB_FORM_MAX_WIDTH = 420;

/** Max-width for content pages (account, delete-account) */
export const WEB_CONTENT_MAX_WIDTH = 600;

/** Max-width for the chat area */
export const WEB_CHAT_MAX_WIDTH = 800;

/** Max-width for list/browse pages (materia medica) */
export const WEB_LIST_MAX_WIDTH = 700;

/** Centers content with a max-width on web. No-op on native. */
export function webMaxWidth(maxWidth: number): ViewStyle {
  if (!isWeb) return {};
  return {
    maxWidth,
    width: '100%',
    alignSelf: 'center',
  } as ViewStyle;
}

/** Adds pointer cursor on web. No-op on native. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webPointer: ViewStyle = isWeb ? { cursor: 'pointer' } as any : {};
