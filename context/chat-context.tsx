import { ChatState, Message, Thread } from '@/types/chat';
import { useAction, useConvexAuth, useQuery } from 'convex/react';
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import { api } from '../convex/_generated/api.js';
import { useMixpanel } from './mixpanel-context';

// Re-export types for consumers who import from context
export type { ChatState, Message, Thread } from '@/types/chat';

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

// Context types
interface ChatContextType {
  state: ChatState;
  activeThread: Thread | null;
  isLoading: boolean;
  isMessagesLoading: boolean;
  isSending: boolean;
  isAuthenticated: boolean;
  sendError: string | null;
  createThread: () => Promise<void>;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearSendError: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const { track, incrementUserProperty } = useMixpanel();

  // Get auth state from Convex (not Clerk directly)
  // This ensures we only make authenticated requests when Convex has the JWT token
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  // Fetch threads from Convex (no userId needed - server uses auth)
  // Skip the query if not authenticated
  const threadsResult = useQuery(
    api.threads.list,
    isAuthenticated ? {} : "skip"
  );
  
  // Fetch messages for active thread
  const messagesResult = useQuery(
    api.messages.list,
    activeThreadId && isAuthenticated ? { threadId: activeThreadId } : "skip"
  );

  // Mutations and actions
  const createThreadAction = useAction(api.threads.create);
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

  // Loading state - include auth loading
  const isLoading = isAuthLoading || (isAuthenticated && threadsResult === undefined);

  // Messages loading state - true when we have an active thread but messages haven't loaded yet
  const isMessagesLoading = Boolean(activeThreadId && isAuthenticated && messagesResult === undefined);

  // Auto-select first thread if none selected
  React.useEffect(() => {
    if (!isLoading && threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, [isLoading, threads, activeThreadId]);

  // Clear active thread when user signs out
  React.useEffect(() => {
    if (!isAuthenticated) {
      setActiveThreadId(null);
    }
  }, [isAuthenticated]);

  // Create new thread (no userId needed - server uses auth)
  const createThread = useCallback(async () => {
    if (!isAuthenticated) {
      console.error('Cannot create thread: User not authenticated');
      return;
    }
    try {
      const result = await createThreadAction({
        title: 'New Chat',
      });
      setActiveThreadId(result.threadId);
      track('Thread Created', { thread_id: result.threadId });
      incrementUserProperty('threads_created');
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  }, [isAuthenticated, createThreadAction, track, incrementUserProperty]);

  // Select thread
  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    if (!isAuthenticated) {
      console.error('Cannot delete thread: User not authenticated');
      return;
    }
    try {
      await deleteThreadAction({ threadId });
      track('Thread Deleted', { thread_id: threadId });
      if (activeThreadId === threadId) {
        const remainingThreads = threads.filter(t => t.id !== threadId);
        setActiveThreadId(remainingThreads[0]?.id ?? null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  }, [isAuthenticated, deleteThreadAction, activeThreadId, threads, track]);

  // Clear send error
  const clearSendError = useCallback(() => {
    setSendError(null);
    setLastFailedMessage(null);
  }, []);

  // Send message (no userId needed - server uses auth)
  const sendMessage = useCallback(async (content: string) => {
    if (!activeThreadId || isSending) return;
    if (!isAuthenticated) {
      console.error('Cannot send message: User not authenticated');
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      await sendMessageAction({
        threadId: activeThreadId,
        content,
      });
      setLastFailedMessage(null);
      track('Message Sent', { 
        thread_id: activeThreadId, 
        message_length: content.length 
      });
      incrementUserProperty('messages_sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Failed to send message:', error);
      setSendError(errorMessage);
      setLastFailedMessage(content);
    } finally {
      setIsSending(false);
    }
  }, [activeThreadId, isSending, isAuthenticated, sendMessageAction, track, incrementUserProperty]);

  // Retry last failed message
  const retryLastMessage = useCallback(async () => {
    if (!lastFailedMessage) return;
    await sendMessage(lastFailedMessage);
  }, [lastFailedMessage, sendMessage]);

  return (
    <ChatContext.Provider
      value={{
        state,
        activeThread,
        isLoading,
        isMessagesLoading,
        isSending,
        isAuthenticated,
        sendError,
        createThread,
        selectThread,
        deleteThread,
        sendMessage,
        retryLastMessage,
        clearSendError,
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
