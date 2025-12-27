import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { ChatState, Thread } from '@/types/chat';

const STORAGE_KEY = 'chat_state';

export function useChatStorage() {
  const loadState = useCallback(async (): Promise<ChatState | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as ChatState;
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
      return JSON.parse(data) as ChatState;
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

