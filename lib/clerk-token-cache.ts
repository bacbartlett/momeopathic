import * as SecureStore from 'expo-secure-store';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';

const PREFIX = 'clerk-token-cache';

/**
 * Token cache implementation using expo-secure-store.
 * This ensures authentication tokens persist securely across app restarts
 * and device reboots, preventing users from being logged out.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string): Promise<string | undefined | null> {
    try {
      const item = await SecureStore.getItemAsync(`${PREFIX}-${key}`);
      if (item) {
        console.log(`[TokenCache] Retrieved token for key: ${key}`);
      }
      return item ?? null;
    } catch (err) {
      console.error('[TokenCache] Error getting token from cache:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(`${PREFIX}-${key}`, value, {
        // Ensure tokens are accessible after device restart
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      console.log(`[TokenCache] Saved token for key: ${key}`);
    } catch (err) {
      console.error('[TokenCache] Error saving token to cache:', err);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${PREFIX}-${key}`);
      console.log(`[TokenCache] Cleared token for key: ${key}`);
    } catch (err) {
      console.error('[TokenCache] Error clearing token from cache:', err);
    }
  },
};

