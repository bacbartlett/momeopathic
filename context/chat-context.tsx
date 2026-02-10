import { ChatState, Message, Thread } from '@/types/chat';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../convex/_generated/api.js';
import { useGuest } from './guest-context';
import { usePostHogAnalytics } from './posthog-context';

// Re-export types for consumers who import from context
export type { ChatState, Message, Thread } from '@/types/chat';

// UIMessage shape from the actual Convex agent response
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

interface FailedMessageRetry {
  content: string;
  threadId: string;
}

// Context types
interface ChatContextType {
  state: ChatState;
  activeThread: Thread | null;
  isLoading: boolean;
  isMessagesLoading: boolean;
  isSending: boolean;
  isCreatingThread: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestLimitReached: boolean;
  sendError: string | null;
  createThreadError: string | null;
  deleteThreadError: string | null;
  createThread: () => Promise<void>;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearSendError: () => void;
  clearCreateThreadError: () => void;
  clearDeleteThreadError: () => void;
  clearGuestLimitReached: () => void;
  debugForceDivider: boolean;
  setDebugForceDivider: (value: boolean) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [createThreadError, setCreateThreadError] = useState<string | null>(null);
  const [deleteThreadError, setDeleteThreadError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<FailedMessageRetry | null>(null);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [debugForceDivider, setDebugForceDivider] = useState(false);
  const [threadInitialized, setThreadInitialized] = useState(false);
  const { track, incrementUserProperty } = usePostHogAnalytics();

  // Use refs for race condition prevention
  const isSendingRef = useRef(false);
  const mountedRef = useRef(true);

  // Track mounted state for cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Get auth state from Convex (not Clerk directly)
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  // Get guest state
  const { guestId, isGuest, isGuestLoading } = useGuest();

  // Determine if we can make queries
  const canQuery = isAuthenticated || isGuest;

  // Fetch threads from Convex
  const threadsResult = useQuery(
    api.threads.list,
    canQuery
      ? isAuthenticated
        ? {}
        : { guestId: guestId! }
      : "skip"
  );

  // Fetch messages for active thread
  const messagesResult = useQuery(
    api.messages.list,
    activeThreadId && canQuery
      ? isAuthenticated
        ? { threadId: activeThreadId }
        : { threadId: activeThreadId, guestId: guestId! }
      : "skip"
  );

  // Mutations and actions
  const createThreadAction = useAction(api.threads.create);
  const getOrCreateThreadAction = useAction(api.threads.getOrCreate);
  const deleteThreadAction = useAction(api.threads.remove);
  const sendMessageAction = useAction(api.messages.send);
  const incrementFeedbackThreadCount = useMutation(api.feedback.incrementThreadCount);

  // Transform Convex threads to UI threads
  const threads = useMemo((): Thread[] => {
    if (!threadsResult?.page) return [];

    return threadsResult.page.map((thread: ConvexThread) => ({
      id: thread._id,
      title: thread.title || 'New Chat',
      messages: [],
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

  // Loading state - include auth loading and guest loading
  const isLoading = isAuthLoading || isGuestLoading || (canQuery && threadsResult === undefined);

  // Messages loading state
  const isMessagesLoading = Boolean(activeThreadId && canQuery && messagesResult === undefined);

  // Single-thread model: Initialize thread on app start using getOrCreate
  React.useEffect(() => {
    const initializeThread = async () => {
      if (!canQuery || threadInitialized || isCreatingThread) return;
      
      setIsCreatingThread(true);
      try {
        const actionArgs = isAuthenticated ? {} : { guestId: guestId! };
        const result = await getOrCreateThreadAction(actionArgs);
        
        if (mountedRef.current) {
          setActiveThreadId(result.threadId);
          setThreadInitialized(true);
          
          if (result.isNew) {
            track('Thread Created', { thread_id: result.threadId, is_guest: isGuest });
            incrementUserProperty('threads_created');
          }
        }
      } catch (error) {
        console.error('Failed to initialize thread:', error);
        if (mountedRef.current) {
          setCreateThreadError(error instanceof Error ? error.message : 'Failed to initialize');
        }
      } finally {
        if (mountedRef.current) {
          setIsCreatingThread(false);
        }
      }
    };

    if (!isLoading && canQuery && !activeThreadId && !threadInitialized) {
      initializeThread();
    }
  }, [isLoading, canQuery, activeThreadId, threadInitialized, isAuthenticated, isGuest, guestId, isCreatingThread, getOrCreateThreadAction, track, incrementUserProperty]);

  // Legacy: Auto-select first thread if none selected (fallback for existing threads)
  React.useEffect(() => {
    if (!isLoading && threads.length > 0 && !activeThreadId && !threadInitialized) {
      setActiveThreadId(threads[0].id);
    }
  }, [isLoading, threads, activeThreadId, threadInitialized]);

  // Clear active thread when user signs out (and is not a guest)
  React.useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      setActiveThreadId(null);
    }
  }, [isAuthenticated, isGuest]);

  // Clear retry state when leaving the failed thread.
  React.useEffect(() => {
    if (!lastFailedMessage) return;
    if (activeThreadId !== lastFailedMessage.threadId) {
      setLastFailedMessage(null);
    }
  }, [activeThreadId, lastFailedMessage]);

  // Recover from stale thread id after auth/guest transitions.
  React.useEffect(() => {
    if (isLoading || !activeThreadId || threadsResult === undefined) {
      return;
    }

    const hasActiveThread = threads.some((thread) => thread.id === activeThreadId);
    if (!hasActiveThread) {
      setActiveThreadId(null);
      setThreadInitialized(false);
    }
  }, [isLoading, activeThreadId, threadsResult, threads]);

  // Clear error states
  const clearCreateThreadError = useCallback(() => {
    setCreateThreadError(null);
  }, []);

  const clearDeleteThreadError = useCallback(() => {
    setDeleteThreadError(null);
  }, []);

  const clearGuestLimitReached = useCallback(() => {
    setGuestLimitReached(false);
  }, []);

  // Create new thread
  const createThread = useCallback(async () => {
    if (!canQuery) {
      console.error('Cannot create thread: User not authenticated or guest');
      return;
    }
    if (isCreatingThread) {
      return;
    }
    setIsCreatingThread(true);
    setCreateThreadError(null);
    try {
      const actionArgs = isAuthenticated
        ? { title: 'New Chat' }
        : { title: 'New Chat', guestId: guestId! };
      const result = await createThreadAction(actionArgs);
      if (mountedRef.current) {
        setActiveThreadId(result.threadId);
        track('Thread Created', { thread_id: result.threadId, is_guest: isGuest });
        incrementUserProperty('threads_created');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create thread';
      console.error('Failed to create thread:', error);
      if (mountedRef.current) {
        if (errorMessage === 'GUEST_LIMIT_REACHED') {
          setGuestLimitReached(true);
        } else {
          setCreateThreadError(errorMessage);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsCreatingThread(false);
      }
    }
  }, [canQuery, isAuthenticated, isGuest, guestId, isCreatingThread, createThreadAction, track, incrementUserProperty]);

  // Select thread
  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    if (!canQuery) {
      console.error('Cannot delete thread: User not authenticated or guest');
      return;
    }
    setDeleteThreadError(null);
    try {
      const actionArgs = isAuthenticated
        ? { threadId }
        : { threadId, guestId: guestId! };
      await deleteThreadAction(actionArgs);
      if (mountedRef.current) {
        track('Thread Deleted', { thread_id: threadId, is_guest: isGuest });
        if (activeThreadId === threadId) {
          const remainingThreads = threads.filter(t => t.id !== threadId);
          setActiveThreadId(remainingThreads[0]?.id ?? null);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete thread';
      console.error('Failed to delete thread:', error);
      if (mountedRef.current) {
        setDeleteThreadError(errorMessage);
      }
    }
  }, [canQuery, isAuthenticated, isGuest, guestId, deleteThreadAction, activeThreadId, threads, track]);

  // Clear send error
  const clearSendError = useCallback(() => {
    setSendError(null);
    setLastFailedMessage(null);
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeThreadId || isSendingRef.current) return;
    if (!canQuery) {
      console.error('Cannot send message: User not authenticated or guest');
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setSendError(null);
    try {
      const actionArgs = isAuthenticated
        ? { threadId: activeThreadId, content }
        : { threadId: activeThreadId, content, guestId: guestId! };
      await sendMessageAction(actionArgs);
      if (mountedRef.current) {
        setLastFailedMessage(null);
        track('Message Sent', {
          thread_id: activeThreadId,
          message_length: content.length,
          is_guest: isGuest,
        });
        incrementUserProperty('messages_sent');
        // Increment feedback thread count for review prompt tracking (only for authenticated users)
        if (isAuthenticated) {
          incrementFeedbackThreadCount().catch((err) => {
            console.debug('Failed to increment feedback thread count:', err);
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Failed to send message:', error);
      if (mountedRef.current) {
        setSendError(errorMessage);
        setLastFailedMessage({
          content,
          threadId: activeThreadId,
        });
      }
    } finally {
      isSendingRef.current = false;
      if (mountedRef.current) {
        setIsSending(false);
      }
    }
  }, [activeThreadId, canQuery, isAuthenticated, isGuest, guestId, sendMessageAction, track, incrementUserProperty, incrementFeedbackThreadCount]);

  // Retry last failed message
  const retryLastMessage = useCallback(async () => {
    if (!lastFailedMessage) return;
    if (activeThreadId !== lastFailedMessage.threadId) {
      setLastFailedMessage(null);
      return;
    }
    await sendMessage(lastFailedMessage.content);
  }, [activeThreadId, lastFailedMessage, sendMessage]);

  return (
    <ChatContext.Provider
      value={{
        state,
        activeThread,
        isLoading,
        isMessagesLoading,
        isSending,
        isCreatingThread,
        isAuthenticated,
        isGuest,
        guestLimitReached,
        sendError,
        createThreadError,
        deleteThreadError,
        createThread,
        selectThread,
        deleteThread,
        sendMessage,
        retryLastMessage,
        clearSendError,
        clearCreateThreadError,
        clearDeleteThreadError,
        clearGuestLimitReached,
        debugForceDivider,
        setDebugForceDivider,
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
