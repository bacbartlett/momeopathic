import { useAction, useMutation, useQuery } from 'convex/react';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { api } from '../convex/_generated/api.js';

// UIMessage shape from the actual Convex agent response
// Using 'key' instead of '_id' as per the actual type
interface AgentUIMessage {
  key: string;
  role: "user" | "assistant" | "system";
  text: string;
  status?: "pending" | "streaming" | "complete" | "failed" | "success";
  _creationTime: number;
  order: number;
  stepOrder: number;
}

interface ConvexThread {
  _id: string;
  _creationTime: number;
  title?: string;
  summary?: string;
  userId?: string;
}

// UI-friendly types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'pending' | 'streaming' | 'complete' | 'failed';
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
}

// Context types
interface ChatContextType {
  state: ChatState;
  activeThread: Thread | null;
  isLoading: boolean;
  isSending: boolean;
  createThread: () => Promise<void>;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

// Default user ID for now (can be replaced with auth later)
const DEFAULT_USER_ID = "default-user";

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Fetch threads from Convex
  const threadsResult = useQuery(api.threads.list, { userId: DEFAULT_USER_ID });
  
  // Fetch messages for active thread
  const messagesResult = useQuery(
    api.messages.list,
    activeThreadId ? { threadId: activeThreadId } : "skip"
  );

  // Mutations and actions
  const createThreadMutation = useMutation(api.threads.create);
  const deleteThreadAction = useAction(api.threads.remove);
  const sendMessageAction = useAction(api.messages.send);

  // Transform Convex threads to UI threads
  const threads = useMemo((): Thread[] => {
    if (!threadsResult?.page) return [];
    
    return threadsResult.page.map((thread: ConvexThread) => ({
      id: thread._id,
      title: thread.title || 'New Chat',
      messages: [], // Messages are loaded separately for the active thread
      createdAt: thread._creationTime,
      updatedAt: thread._creationTime,
    }));
  }, [threadsResult]);

  // Transform messages for active thread
  const activeThreadMessages = useMemo((): Message[] => {
    if (!messagesResult?.page) return [];
    
    return (messagesResult.page as AgentUIMessage[])
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        id: msg.key,
        role: msg.role as 'user' | 'assistant',
        content: msg.text || '',
        timestamp: msg._creationTime,
        status: msg.status === 'success' ? 'complete' : msg.status,
      }));
  }, [messagesResult]);

  // Build complete active thread with messages
  const activeThread = useMemo((): Thread | null => {
    if (!activeThreadId) return null;
    
    const thread = threads.find(t => t.id === activeThreadId);
    if (!thread) return null;
    
    return {
      ...thread,
      messages: activeThreadMessages,
    };
  }, [activeThreadId, threads, activeThreadMessages]);

  // Build state object
  const state = useMemo((): ChatState => ({
    threads: threads.map(t => 
      t.id === activeThreadId 
        ? { ...t, messages: activeThreadMessages }
        : t
    ),
    activeThreadId,
  }), [threads, activeThreadId, activeThreadMessages]);

  // Loading state
  const isLoading = threadsResult === undefined;

  // Auto-select first thread if none selected
  React.useEffect(() => {
    if (!isLoading && threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, [isLoading, threads, activeThreadId]);

  // Create new thread
  const createThread = useCallback(async () => {
    try {
      const result = await createThreadMutation({
        userId: DEFAULT_USER_ID,
        title: 'New Chat',
      });
      setActiveThreadId(result.threadId);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  }, [createThreadMutation]);

  // Select thread
  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await deleteThreadAction({ threadId });
      if (activeThreadId === threadId) {
        const remainingThreads = threads.filter(t => t.id !== threadId);
        setActiveThreadId(remainingThreads[0]?.id ?? null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  }, [deleteThreadAction, activeThreadId, threads]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeThreadId || isSending) return;

    setIsSending(true);
    try {
      await sendMessageAction({
        threadId: activeThreadId,
        content,
        userId: DEFAULT_USER_ID,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [activeThreadId, isSending, sendMessageAction]);

  return (
    <ChatContext.Provider
      value={{
        state,
        activeThread,
        isLoading,
        isSending,
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
