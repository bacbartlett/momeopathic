import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { ChatState, Thread } from '@/types/chat';

const STORAGE_KEY = 'chat_state';

/**
 * Validates that a parsed object matches the ChatState shape.
 * Returns the validated state or null if invalid.
 */
function validateChatState(data: unknown): ChatState | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  const state = data as Record<string, unknown>;
  
  // Check required fields
  if (!Array.isArray(state.threads)) {
    return null;
  }
  
  // Validate threads array (basic structure check)
  for (const thread of state.threads) {
    if (!thread || typeof thread !== 'object') {
      return null;
    }
    const t = thread as Record<string, unknown>;
    if (typeof t.id !== 'string' || typeof t.title !== 'string') {
      return null;
    }
  }
  
  // Validate activeThreadId is string or null/undefined
  if (state.activeThreadId !== null && 
      state.activeThreadId !== undefined && 
      typeof state.activeThreadId !== 'string') {
    return null;
  }
  
  return state as unknown as ChatState;
}

/**
 * Safely parse JSON with validation.
 * Returns null if parsing fails or data is invalid.
 */
function safeParseJSON<T>(
  data: string, 
  validator: (data: unknown) => T | null
): T | null {
  try {
    const parsed = JSON.parse(data);
    return validator(parsed);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

export function useChatStorage() {
  const loadState = useCallback(async (): Promise<ChatState | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const state = safeParseJSON(data, validateChatState);
        if (!state) {
          console.warn('Invalid chat state in storage, clearing...');
          await AsyncStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return state;
      }
      return null;
    } catch (error) {
      console.error('Failed to load chat state:', error);
      return null;
    }
  }, []);

  const saveState = useCallback(async (state: ChatState): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save chat state:', error);
    }
  }, []);

  const clearState = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear chat state:', error);
    }
  }, []);

  return { loadState, saveState, clearState };
}

export async function loadChatState(): Promise<ChatState | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const state = safeParseJSON(data, validateChatState);
      if (!state) {
        console.warn('Invalid chat state in storage, clearing...');
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return state;
    }
    return null;
  } catch (error) {
    console.error('Failed to load chat state:', error);
    return null;
  }
}

export async function saveChatState(state: ChatState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save chat state:', error);
  }
}

