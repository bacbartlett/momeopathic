/**
 * Platform-abstracted storage adapter.
 *
 * On native: uses expo-secure-store (keychain / keystore).
 * On web: uses localStorage (standard browser storage for session tokens).
 *
 * Provides the same async interface expected by ConvexAuthProvider's `storage` prop.
 */

import { Platform } from 'react-native';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function createWebStorage(): StorageAdapter {
  return {
    getItem: async (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('[Storage] Failed to set item:', e);
      }
    },
    removeItem: async (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[Storage] Failed to remove item:', e);
      }
    },
  };
}

function createNativeStorage(): StorageAdapter {
  // Use require() to avoid bundling expo-secure-store on web
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store');
  return {
    getItem: async (key: string) => {
      const val = await SecureStore.getItemAsync(key);
      if (__DEV__) console.log(`[SecureStore] getItem(${key}): ${val ? 'has value (' + val.length + ' chars)' : 'null'}`);
      return val;
    },
    setItem: async (key: string, value: string) => {
      if (__DEV__) console.log(`[SecureStore] setItem(${key}): ${value.length} chars`);
      await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string) => {
      if (__DEV__) console.log(`[SecureStore] removeItem(${key})`);
      await SecureStore.deleteItemAsync(key);
    },
  };
}

let _storage: StorageAdapter | null = null;

/**
 * Get the platform-appropriate storage adapter.
 * - Web: localStorage
 * - Native: expo-secure-store
 */
export function getStorage(): StorageAdapter {
  if (_storage) return _storage;

  if (Platform.OS === 'web') {
    _storage = createWebStorage();
  } else {
    _storage = createNativeStorage();
  }

  return _storage;
}
