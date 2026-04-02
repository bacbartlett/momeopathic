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
// import { usePostHogAnalytics } from './posthog-context';

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
  isGreetingGenerating: boolean;
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
  const [isGreetingGenerating, setIsGreetingGenerating] = useState(false);
  const [threadInitialized, setThreadInitialized] = useState(false);
  // const { track, incrementUserProperty, setUserPropertiesOnce } = usePostHogAnalytics();

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

  // Get auth state from Convex
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  // Determine if we can make queries.
  const canQuery = isAuthenticated;

  // Fetch threads from Convex
  const threadsResult = useQuery(
    api.threads.list,
    canQuery
      ? {}
      : "skip"
  );

  // Fetch messages for active thread
  const messagesResult = useQuery(
    api.messages.list,
    activeThreadId && canQuery
      ? { threadId: activeThreadId }
      : "skip"
  );

  // Mutations and actions
  const createThreadAction = useAction(api.threads.create);
  const getOrCreateThreadAction = useAction(api.threads.getOrCreate);
  const deleteThreadAction = useAction(api.threads.remove);
  const sendMessageAction = useAction(api.messages.send);
  const incrementFeedbackThreadCount = useMutation(api.feedback.incrementThreadCount);
  const triggerGreetingAction = useAction(api.greetings.triggerGreeting);

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

  // Loading state
  const isLoading = isAuthLoading || (canQuery && threadsResult === undefined);

  // Messages loading state
  const isMessagesLoading = Boolean(activeThreadId && canQuery && messagesResult === undefined);

  // Single-thread model: Initialize thread on app start using getOrCreate
  React.useEffect(() => {
    const initializeThread = async () => {
      if (!canQuery || threadInitialized || isCreatingThread) return;

      setIsCreatingThread(true);
      try {
        const result = await getOrCreateThreadAction({});

        if (mountedRef.current) {
          setActiveThreadId(result.threadId);
          setThreadInitialized(true);

          if (result.isNew) {
            // track('Thread Created', { thread_id: result.threadId });
            // incrementUserProperty('threads_created');
          } else {
            // Existing thread: trigger live greeting generation
            setIsGreetingGenerating(true);
            try {
              await triggerGreetingAction({ threadId: result.threadId });
            } catch (err) {
              console.debug('Greeting generation failed:', err);
            } finally {
              if (mountedRef.current) {
                setIsGreetingGenerating(false);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize thread:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
        // track('Thread Create Failed', { error: errorMessage });
        if (mountedRef.current) {
          setCreateThreadError(errorMessage);
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
  }, [isLoading, canQuery, activeThreadId, threadInitialized, isAuthenticated, isCreatingThread, getOrCreateThreadAction, triggerGreetingAction]);

  // Legacy: Auto-select first thread if none selected (fallback for existing threads)
  React.useEffect(() => {
    if (!isLoading && threads.length > 0 && !activeThreadId && !threadInitialized) {
      setActiveThreadId(threads[0].id);
    }
  }, [isLoading, threads, activeThreadId, threadInitialized]);

  // Reset chat state when user signs out
  React.useEffect(() => {
    if (!isAuthenticated) {
      setActiveThreadId(null);
      setThreadInitialized(false);
    }
  }, [isAuthenticated]);

  // Clear retry state when leaving the failed thread.
  React.useEffect(() => {
    if (!lastFailedMessage) return;
    if (activeThreadId !== lastFailedMessage.threadId) {
      setLastFailedMessage(null);
    }
  }, [activeThreadId, lastFailedMessage]);

  // Recover from stale thread id after auth transitions.
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

  // Create new thread
  const createThread = useCallback(async () => {
    if (!canQuery) {
      console.error('Cannot create thread: User not authenticated');
      return;
    }
    if (isCreatingThread) {
      return;
    }
    setIsCreatingThread(true);
    setCreateThreadError(null);
    try {
      const result = await createThreadAction({ title: 'New Chat' });
      if (mountedRef.current) {
        setActiveThreadId(result.threadId);
        // track('Thread Created', { thread_id: result.threadId });
        // incrementUserProperty('threads_created');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create thread';
      console.error('Failed to create thread:', error);
      // track('Thread Create Failed', { error: errorMessage });
      if (mountedRef.current) {
        setCreateThreadError(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsCreatingThread(false);
      }
    }
  }, [canQuery, isAuthenticated, isCreatingThread, createThreadAction]);

  // Select thread
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;
  const selectThread = useCallback((threadId: string) => {
    if (threadId !== activeThreadIdRef.current) {
      // track('Thread Switched', { thread_id: threadId });
    }
    setActiveThreadId(threadId);
  }, []);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    if (!canQuery) {
      console.error('Cannot delete thread: User not authenticated');
      return;
    }
    setDeleteThreadError(null);
    try {
      await deleteThreadAction({ threadId });
      if (mountedRef.current) {
        // track('Thread Deleted', { thread_id: threadId });
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
  }, [canQuery, isAuthenticated, deleteThreadAction, activeThreadId, threads]);

  // Clear send error
  const clearSendError = useCallback(() => {
    setSendError(null);
    setLastFailedMessage(null);
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeThreadId || isSendingRef.current) return;
    if (!canQuery) {
      console.error('Cannot send message: User not authenticated');
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setSendError(null);
    try {
      await sendMessageAction({ threadId: activeThreadId, content });
      if (mountedRef.current) {
        setLastFailedMessage(null);
        // track('Message Sent', {
        //   thread_id: activeThreadId,
        //   message_length: content.length,
        // });
        // incrementUserProperty('messages_sent');
        // setUserPropertiesOnce({ first_message_date: new Date().toISOString() });
        // Increment feedback thread count for review prompt tracking
        if (isAuthenticated) {
          incrementFeedbackThreadCount().catch((err) => {
            console.debug('Failed to increment feedback thread count:', err);
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Failed to send message:', error);
      // track('Message Send Failed', {
      //   thread_id: activeThreadId,
      //   error: errorMessage,
      // });
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
  }, [activeThreadId, canQuery, isAuthenticated, sendMessageAction, incrementFeedbackThreadCount]);

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
        isGreetingGenerating,
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
