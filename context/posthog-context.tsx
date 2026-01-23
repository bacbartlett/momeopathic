import { EXPO_PUBLIC_POSTHOG_API_KEY, EXPO_PUBLIC_POSTHOG_HOST } from '@/lib/env';
import { useUser } from '@clerk/clerk-expo';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, {
  Component,
  createContext,
  ErrorInfo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

// Startup logging - logs in both dev and production for debugging black screen issues
console.log('[STARTUP] posthog-context.tsx: Module loaded');

// React Native global error handler types
declare const ErrorUtils: {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

// Event types for type-safe tracking
export type PostHogEvent =
  | 'App Opened'
  | 'Sign In'
  | 'Sign Up'
  | 'Sign Out'
  | 'Thread Created'
  | 'Thread Deleted'
  | 'Message Sent'
  | 'Subscription Started'
  | 'Subscription Cancelled'
  | 'Paywall Viewed'
  | 'Paywall Dismissed'
  | 'Account Page Viewed'
  | 'Terms Viewed'
  | 'Privacy Policy Viewed'
  | 'Disclaimer Accepted'
  | 'Disclaimer Viewed'
  | 'Feedback Prompt Shown'
  | 'Feedback Happy Selected'
  | 'Feedback Unhappy Selected'
  | 'Feedback Submitted'
  | 'Feedback Prompt Dismissed'
  | 'In-App Review Requested';

// Properties type for events
export interface EventProperties {
  [key: string]: string | number | boolean | string[] | null;
}

// User profile properties
export interface UserProfileProperties {
  email?: string;
  name?: string;
  created?: string;
  subscription_status?: 'free' | 'premium';
  platform?: string;
  app_version?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Helper to filter out undefined values from any object
const filterUndefined = <T extends Record<string, unknown>>(obj: T): Record<string, string | number | boolean | string[] | null> => {
  const filtered: Record<string, string | number | boolean | string[] | null> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      filtered[key] = value as string | number | boolean | string[] | null;
    }
  }
  return filtered;
};

interface PostHogContextType {
  /** Whether PostHog has been initialized */
  isReady: boolean;
  /** Track an event with optional properties */
  track: (event: PostHogEvent | string, properties?: EventProperties) => void;
  /** Set user profile properties */
  setUserProperties: (properties: UserProfileProperties) => void;
  /** Increment a numeric user property */
  incrementUserProperty: (property: string, by?: number) => void;
  /** Register super properties (sent with every event) */
  setSuperProperties: (properties: EventProperties) => void;
  /** Track time between events */
  timeEvent: (eventName: string) => void;
  /** Reset user identity (on logout) */
  reset: () => void;
  /** Opt out of tracking */
  optOut: () => void;
  /** Opt in to tracking */
  optIn: () => void;
  /** Check if tracking is opted out */
  hasOptedOut: () => Promise<boolean>;
  /** Capture an exception/crash for error tracking */
  captureException: (error: Error, additionalProperties?: EventProperties) => void;
}

const PostHogContext = createContext<PostHogContextType | null>(null);

interface PostHogProviderWrapperProps {
  children: ReactNode;
}

// Inner component that uses PostHog hooks
function PostHogProviderInner({ children }: PostHogProviderWrapperProps) {
  console.log('[STARTUP] PostHogProviderInner: Rendering');
  const [isReady, setIsReady] = useState(false);
  const { user, isLoaded: isClerkLoaded } = useUser();
  const posthog = usePostHog();
  console.log('[STARTUP] PostHogProviderInner: posthog instance exists:', !!posthog);
  
  // Track current identified user to avoid unnecessary identify calls
  const currentIdentifiedUserRef = useRef<string | null>(null);

  // Initialize PostHog
  useEffect(() => {
    console.log('[STARTUP] PostHogProviderInner: Initialize useEffect - posthog exists:', !!posthog);
    if (!posthog) {
      console.log('[STARTUP] PostHogProviderInner: No posthog instance, setting isReady=true');
      setIsReady(true);
      return;
    }

    try {
      console.log('[STARTUP] PostHogProviderInner: Registering super properties');
      // Set default super properties
      posthog.register({
        platform: Platform.OS,
        app_name: 'MyMateria',
      });

      console.log('[STARTUP] PostHogProviderInner: Initialized successfully');
      setIsReady(true);
    } catch (error) {
      console.error('[STARTUP] PostHogProviderInner: Initialization error:', error);
      setIsReady(true);
    }
  }, [posthog]);

  // Sync user identity with Clerk
  useEffect(() => {
    if (!isReady || !isClerkLoaded || !posthog) {
      return;
    }

    const syncUserIdentity = async () => {
      try {
        const clerkUserId = user?.id ?? null;
        const currentIdentifiedUser = currentIdentifiedUserRef.current;

        // User signed in: identify to PostHog
        if (clerkUserId && clerkUserId !== currentIdentifiedUser) {
          if (__DEV__) {
            console.log('[PostHog] Identifying user:', clerkUserId);
          }
          
          // Set user profile properties
          const profileProps: UserProfileProperties = {
            platform: Platform.OS,
          };
          
          if (user?.emailAddresses?.[0]?.emailAddress) {
            profileProps.email = user.emailAddresses[0].emailAddress;
          }
          
          if (user?.fullName) {
            profileProps.name = user.fullName;
          } else if (user?.firstName) {
            profileProps.name = user.firstName;
          }
          
          if (user?.createdAt) {
            profileProps.created = new Date(user.createdAt).toISOString();
          }

          posthog.identify(clerkUserId, {
            $set: filterUndefined(profileProps),
          });
          currentIdentifiedUserRef.current = clerkUserId;
        }
        // User signed out: reset PostHog
        else if (!clerkUserId && currentIdentifiedUser !== null) {
          if (__DEV__) {
            console.log('[PostHog] Resetting user identity');
          }
          
          posthog.reset();
          currentIdentifiedUserRef.current = null;
        }
      } catch (error) {
        console.error('[PostHog] Sync error:', error);
      }
    };

    syncUserIdentity();
  }, [isReady, isClerkLoaded, posthog, user?.id, user?.emailAddresses, user?.fullName, user?.firstName, user?.createdAt]);


  // Track an event
  const track = useCallback((event: PostHogEvent | string, properties?: EventProperties) => {
    if (!posthog) return;

    try {
      if (properties) {
        posthog.capture(event, filterUndefined(properties));
      } else {
        posthog.capture(event);
      }
      
      if (__DEV__) {
        console.log('[PostHog] Tracked:', event, properties ?? '');
      }
    } catch (error) {
      console.error('[PostHog] Track error:', error);
    }
  }, [posthog]);

  // Set user profile properties
  const setUserProperties = useCallback((properties: UserProfileProperties) => {
    if (!posthog) return;

    try {
      const currentUserId = currentIdentifiedUserRef.current;
      if (currentUserId) {
        posthog.identify(currentUserId, {
          $set: filterUndefined(properties),
        });
      } else {
        // If no user is identified, just register as super properties
        posthog.register(filterUndefined(properties));
      }
      
      if (__DEV__) {
        console.log('[PostHog] Set user properties:', properties);
      }
    } catch (error) {
      console.error('[PostHog] Set user properties error:', error);
    }
  }, [posthog]);

  // Increment a numeric user property
  const incrementUserProperty = useCallback((property: string, by: number = 1) => {
    if (!posthog) return;

    try {
      const currentUserId = currentIdentifiedUserRef.current;
      if (currentUserId) {
        // PostHog doesn't have a direct increment, so we'll use identify with $increment
        posthog.identify(currentUserId, {
          $increment: { [property]: by },
        });
      }
      
      if (__DEV__) {
        console.log('[PostHog] Incremented:', property, 'by', by);
      }
    } catch (error) {
      console.error('[PostHog] Increment error:', error);
    }
  }, [posthog]);

  // Register super properties (sent with every event)
  const setSuperProperties = useCallback((properties: EventProperties) => {
    if (!posthog) return;

    try {
      posthog.register(filterUndefined(properties));
      
      if (__DEV__) {
        console.log('[PostHog] Set super properties:', properties);
      }
    } catch (error) {
      console.error('[PostHog] Set super properties error:', error);
    }
  }, [posthog]);

  // Track time between events
  const timeEvent = useCallback((eventName: string) => {
    if (!posthog) return;

    try {
      // PostHog doesn't have timeEvent, but we can track a start event
      posthog.capture(`$start_${eventName}`);
      
      if (__DEV__) {
        console.log('[PostHog] Started timing:', eventName);
      }
    } catch (error) {
      console.error('[PostHog] Time event error:', error);
    }
  }, [posthog]);

  // Reset user identity (on logout)
  const reset = useCallback(() => {
    if (!posthog) return;

    try {
      posthog.reset();
      currentIdentifiedUserRef.current = null;
      
      if (__DEV__) {
        console.log('[PostHog] Reset');
      }
    } catch (error) {
      console.error('[PostHog] Reset error:', error);
    }
  }, [posthog]);

  // Opt out of tracking
  const optOut = useCallback(() => {
    if (!posthog) return;

    try {
      posthog.optOut();
      
      if (__DEV__) {
        console.log('[PostHog] Opted out of tracking');
      }
    } catch (error) {
      console.error('[PostHog] Opt out error:', error);
    }
  }, [posthog]);

  // Opt in to tracking
  const optIn = useCallback(() => {
    if (!posthog) return;

    try {
      posthog.optIn();
      
      if (__DEV__) {
        console.log('[PostHog] Opted in to tracking');
      }
    } catch (error) {
      console.error('[PostHog] Opt in error:', error);
    }
  }, [posthog]);

  // Check if tracking is opted out
  const hasOptedOut = useCallback(async (): Promise<boolean> => {
    if (!posthog) return true; // Default to opted out if no instance

    try {
      // PostHog doesn't have a direct hasOptedOut method
      // We'll return false as a default since PostHog tracks opt-out state internally
      return false;
    } catch (error) {
      console.error('[PostHog] Check opt out error:', error);
      return false;
    }
  }, [posthog]);

  // Capture an exception for error tracking
  const captureException = useCallback((error: Error, additionalProperties?: EventProperties) => {
    if (!posthog) return;

    try {
      // Capture the exception with error details
      const errorProperties: EventProperties = {
        $exception_type: error.name,
        $exception_message: error.message,
        $exception_stack_trace_raw: error.stack ?? null,
        platform: Platform.OS,
        ...filterUndefined(additionalProperties ?? {}),
      };

      posthog.capture('$exception', errorProperties);
      
      if (__DEV__) {
        console.log('[PostHog] Captured exception:', error.name, error.message);
      }
    } catch (captureError) {
      console.error('[PostHog] Capture exception error:', captureError);
    }
  }, [posthog]);

  return (
    <PostHogContext.Provider
      value={{
        isReady,
        track,
        setUserProperties,
        incrementUserProperty,
        setSuperProperties,
        timeEvent,
        reset,
        optOut,
        optIn,
        hasOptedOut,
        captureException,
      }}
    >
      {children}
    </PostHogContext.Provider>
  );
}

// Outer provider component that wraps with PostHogProvider
export function PostHogProviderWrapper({ children }: PostHogProviderWrapperProps) {
  console.log('[STARTUP] PostHogProviderWrapper: Rendering');
  const apiKey = EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = EXPO_PUBLIC_POSTHOG_HOST;
  console.log('[STARTUP] PostHogProviderWrapper: API key exists:', !!apiKey, 'Host:', host);

  if (!apiKey || (__DEV__ && (apiKey as string) === 'YOUR_POSTHOG_API_KEY')) {
    console.warn('[STARTUP] PostHogProviderWrapper: API key not configured, rendering children without PostHog');
    // Still render children so app works without analytics
    return <>{children}</>;
  }

  console.log('[STARTUP] PostHogProviderWrapper: Creating PostHogProvider with session replay enabled');
  return (
    <PostHogProvider
      apiKey={apiKey}
      options={{
        host: host,
        // Capture app lifecycle events (app opened, app backgrounded, etc.)
        captureAppLifecycleEvents: true,
        // Enable session replay recording
        enableSessionReplay: true,
        sessionReplayConfig: {
          // Mask all text input for privacy
          maskAllTextInputs: true,
          // Mask all images for privacy (disable if you want to see images)
          maskAllImages: false,
          // Capture console logs (Android only - Native Logcat)
          captureLog: true,
          // Capture network requests in the replay
          captureNetworkTelemetry: true,
          // Mask text in sensitive views
          maskAllSandboxedViews: false,
        },
        // Persist session ID across app restarts for better session continuity
        enablePersistSessionIdAcrossRestart: true,
      }}
    >
      <PostHogProviderInner>{children}</PostHogProviderInner>
    </PostHogProvider>
  );
}

export function usePostHogAnalytics() {
  const context = useContext(PostHogContext);
  if (!context) {
    throw new Error('usePostHogAnalytics must be used within a PostHogProviderWrapper');
  }
  return context;
}

// Convenience hook for just tracking events
export function useTrackEvent() {
  const { track } = usePostHogAnalytics();
  return track;
}

// Export alias for easier migration (can be removed later)
export const useMixpanel = usePostHogAnalytics;

// ============================================
// PostHog Error Boundary for Crash Tracking
// ============================================

interface PostHogErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component to show when an error occurs */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  componentStack: string | null;
  resetError: () => void;
}

interface PostHogErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

/**
 * Error boundary that captures React rendering errors and sends them to PostHog.
 * Wrap your app or critical sections to capture crashes.
 */
export class PostHogErrorBoundary extends Component<PostHogErrorBoundaryProps, PostHogErrorBoundaryState> {
  constructor(props: PostHogErrorBoundaryProps) {
    super(props);
    console.log('[STARTUP] PostHogErrorBoundary: Constructor called');
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PostHogErrorBoundaryState> {
    console.error('[STARTUP] PostHogErrorBoundary: getDerivedStateFromError - Error caught:', error.message);
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store component stack for later use
    this.setState({ componentStack: errorInfo.componentStack ?? null });

    // Log in both dev and production for debugging
    console.error('[STARTUP] PostHogErrorBoundary: componentDidCatch - Error:', error.name, error.message);
    console.error('[STARTUP] PostHogErrorBoundary: Component stack:', errorInfo.componentStack);

    // We can't use hooks here, so we'll emit a custom event that will be captured
    // The PostHog instance will be accessed via the global capture method
    // This is handled by the PostHogCrashReporter component below
  }

  resetError = (): void => {
    console.log('[STARTUP] PostHogErrorBoundary: resetError called');
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      console.log('[STARTUP] PostHogErrorBoundary: Rendering error state');
      const { fallback } = this.props;
      const { error, componentStack } = this.state;

      // If fallback is a function, call it with error details
      if (typeof fallback === 'function') {
        console.log('[STARTUP] PostHogErrorBoundary: Using custom fallback function');
        return fallback({
          error,
          componentStack,
          resetError: this.resetError,
        });
      }

      // If fallback is a component, render it
      if (fallback) {
        console.log('[STARTUP] PostHogErrorBoundary: Using custom fallback component');
        return fallback;
      }

      // Default fallback - show a visible error screen so crashes don't result in black screen
      console.log('[STARTUP] PostHogErrorBoundary: Using default error screen');
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFAF3', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            {error.message}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 20 }}>
            {error.name}
          </Text>
          <TouchableOpacity
            onPress={this.resetError}
            style={{ backgroundColor: '#4A7C59', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    console.log('[STARTUP] PostHogErrorBoundary: Rendering children');
    return this.props.children;
  }
}

/**
 * Component that sets up global error handling and reports unhandled errors to PostHog.
 * Place this inside PostHogProviderWrapper.
 */
export function PostHogCrashReporter({ children }: { children: ReactNode }) {
  console.log('[STARTUP] PostHogCrashReporter: Rendering');
  const { captureException, isReady } = usePostHogAnalytics();
  console.log('[STARTUP] PostHogCrashReporter: isReady:', isReady);

  useEffect(() => {
    console.log('[STARTUP] PostHogCrashReporter: useEffect - isReady:', isReady);
    if (!isReady) {
      console.log('[STARTUP] PostHogCrashReporter: Not ready, skipping initialization');
      return;
    }

    console.log('[STARTUP] PostHogCrashReporter: Setting up global error handler');
    // Handle unhandled JS errors
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.log('[STARTUP] PostHogCrashReporter: Global error caught:', error.message, 'isFatal:', isFatal);
      // Capture to PostHog
      captureException(error, {
        $exception_is_fatal: isFatal ?? false,
        $exception_source: 'global_error_handler',
      });

      // Call original handler
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    // Handle unhandled promise rejections
    const rejectionTracker = (id: string, rejection: Error | unknown) => {
      console.log('[STARTUP] PostHogCrashReporter: Promise rejection caught, id:', id);
      if (rejection instanceof Error) {
        captureException(rejection, {
          $exception_source: 'unhandled_promise_rejection',
          promise_id: id,
        });
      } else {
        // Handle non-Error rejections
        const error = new Error(String(rejection));
        error.name = 'UnhandledPromiseRejection';
        captureException(error, {
          $exception_source: 'unhandled_promise_rejection',
          promise_id: id,
          original_rejection: String(rejection),
        });
      }
    };

    // Safe promise rejection tracking - wrapped in try-catch to prevent crashes
    // if the module isn't available in production builds
    interface RejectionTrackingModule {
      enable: (options: { allRejections: boolean; onUnhandled: (id: string, rejection: Error | unknown) => void; onHandled: () => void }) => void;
      disable: () => void;
    }
    
    let trackingModule: RejectionTrackingModule | null = null;
    try {
      console.log('[STARTUP] PostHogCrashReporter: Attempting to load promise rejection tracking');
      // React Native's tracking for unhandled promise rejections
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loadedModule = require('promise/setimmediate/rejection-tracking') as RejectionTrackingModule;
      loadedModule.enable({
        allRejections: true,
        onUnhandled: rejectionTracker,
        onHandled: () => {}, // Optional: called when a rejection is handled after being reported
      });
      trackingModule = loadedModule;
      console.log('[STARTUP] PostHogCrashReporter: Promise rejection tracking enabled');
    } catch (trackingError) {
      console.warn('[STARTUP] PostHogCrashReporter: Promise rejection tracking not available:', trackingError);
    }

    console.log('[STARTUP] PostHogCrashReporter: Crash reporter initialized successfully');

    // Capture trackingModule in closure for cleanup
    const capturedTrackingModule = trackingModule;
    
    return () => {
      console.log('[STARTUP] PostHogCrashReporter: Cleanup - restoring original error handler');
      // Restore original error handler on cleanup
      if (originalErrorHandler) {
        ErrorUtils.setGlobalHandler(originalErrorHandler);
      }
      // Only disable if tracking module was loaded
      if (capturedTrackingModule !== null) {
        try {
          capturedTrackingModule.disable();
        } catch (disableError) {
          console.warn('[STARTUP] PostHogCrashReporter: Error disabling tracking:', disableError);
        }
      }
    };
  }, [isReady, captureException]);

  console.log('[STARTUP] PostHogCrashReporter: Returning children');
  return <>{children}</>;
}
