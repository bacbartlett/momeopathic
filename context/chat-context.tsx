import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { ChatState, Thread, Message } from '@/types/chat';
import { loadChatState, saveChatState } from '@/hooks/use-chat-storage';

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Generate a title from the first message
function generateTitle(content: string): string {
  const maxLength = 30;
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

// Actions
type ChatAction =
  | { type: 'LOAD_STATE'; payload: ChatState }
  | { type: 'CREATE_THREAD' }
  | { type: 'SELECT_THREAD'; payload: string }
  | { type: 'DELETE_THREAD'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: { threadId: string; message: Message } }
  | { type: 'UPDATE_THREAD_TITLE'; payload: { threadId: string; title: string } };

const initialState: ChatState = {
  threads: [],
  activeThreadId: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'CREATE_THREAD': {
      const newThread: Thread = {
        id: generateId(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        ...state,
        threads: [newThread, ...state.threads],
        activeThreadId: newThread.id,
      };
    }

    case 'SELECT_THREAD':
      return {
        ...state,
        activeThreadId: action.payload,
      };

    case 'DELETE_THREAD': {
      const filteredThreads = state.threads.filter((t) => t.id !== action.payload);
      const newActiveId =
        state.activeThreadId === action.payload
          ? filteredThreads[0]?.id ?? null
          : state.activeThreadId;
      return {
        ...state,
        threads: filteredThreads,
        activeThreadId: newActiveId,
      };
    }

    case 'ADD_MESSAGE': {
      const { threadId, message } = action.payload;
      return {
        ...state,
        threads: state.threads.map((thread) => {
          if (thread.id !== threadId) return thread;
          const updatedMessages = [...thread.messages, message];
          // Update title if this is the first user message
          const shouldUpdateTitle =
            thread.title === 'New Chat' &&
            message.role === 'user' &&
            thread.messages.filter((m) => m.role === 'user').length === 0;
          return {
            ...thread,
            messages: updatedMessages,
            title: shouldUpdateTitle ? generateTitle(message.content) : thread.title,
            updatedAt: Date.now(),
          };
        }),
      };
    }

    case 'UPDATE_THREAD_TITLE':
      return {
        ...state,
        threads: state.threads.map((thread) =>
          thread.id === action.payload.threadId
            ? { ...thread, title: action.payload.title, updatedAt: Date.now() }
            : thread
        ),
      };

    default:
      return state;
  }
}

// Context types
interface ChatContextType {
  state: ChatState;
  activeThread: Thread | null;
  isLoading: boolean;
  createThread: () => void;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  sendMessage: (content: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load state on mount
  useEffect(() => {
    async function init() {
      const savedState = await loadChatState();
      if (savedState) {
        dispatch({ type: 'LOAD_STATE', payload: savedState });
      }
      setIsLoading(false);
    }
    init();
  }, []);

  // Save state on changes
  useEffect(() => {
    if (!isLoading) {
      saveChatState(state);
    }
  }, [state, isLoading]);

  const activeThread = state.threads.find((t) => t.id === state.activeThreadId) ?? null;

  const createThread = useCallback(() => {
    dispatch({ type: 'CREATE_THREAD' });
  }, []);

  const selectThread = useCallback((threadId: string) => {
    dispatch({ type: 'SELECT_THREAD', payload: threadId });
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    dispatch({ type: 'DELETE_THREAD', payload: threadId });
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!state.activeThreadId) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      dispatch({
        type: 'ADD_MESSAGE',
        payload: { threadId: state.activeThreadId, message: userMessage },
      });

      // Simulate assistant response (placeholder for actual API integration)
      setTimeout(() => {
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: getMockResponse(content),
          timestamp: Date.now(),
        };
        dispatch({
          type: 'ADD_MESSAGE',
          payload: { threadId: state.activeThreadId!, message: assistantMessage },
        });
      }, 800);
    },
    [state.activeThreadId]
  );

  return (
    <ChatContext.Provider
      value={{
        state,
        activeThread,
        isLoading,
        createThread,
        selectThread,
        deleteThread,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

// Mock responses for UI testing
function getMockResponse(userMessage: string): string {
  const responses = [
    "I understand you're asking about that. Let me help you explore this topic further.",
    "That's an interesting question! Here's what I think...",
    "Great point! I'd be happy to discuss this with you.",
    "Thanks for sharing that. Could you tell me more about what you're looking for?",
    "I'm here to help! Based on what you've said, here are some thoughts...",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

