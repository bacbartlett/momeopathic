import * as SecureStore from 'expo-secure-store';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';

const PREFIX = 'clerk-token-cache';

export const tokenCache: TokenCache = {
  async getToken(key: string): Promise<string | undefined | null> {
    try {
      const item = await SecureStore.getItemAsync(`${PREFIX}-${key}`);
      return item ?? null;
    } catch (err) {
      console.error('Error getting token from cache:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(`${PREFIX}-${key}`, value);
    } catch (err) {
      console.error('Error saving token to cache:', err);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${PREFIX}-${key}`);
    } catch (err) {
      console.error('Error clearing token from cache:', err);
    }
  },
};

