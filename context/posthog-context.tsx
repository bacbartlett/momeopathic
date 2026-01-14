import { EXPO_PUBLIC_POSTHOG_API_KEY, EXPO_PUBLIC_POSTHOG_HOST } from '@/lib/env';
import { useUser } from '@clerk/clerk-expo';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

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
  | 'Disclaimer Viewed';

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
}

const PostHogContext = createContext<PostHogContextType | null>(null);

interface PostHogProviderWrapperProps {
  children: ReactNode;
}

// Inner component that uses PostHog hooks
function PostHogProviderInner({ children }: PostHogProviderWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const { user, isLoaded: isClerkLoaded } = useUser();
  const posthog = usePostHog();
  
  // Track current identified user to avoid unnecessary identify calls
  const currentIdentifiedUserRef = useRef<string | null>(null);

  // Initialize PostHog
  useEffect(() => {
    if (!posthog) {
      setIsReady(true);
      return;
    }

    try {
      // Set default super properties
      posthog.register({
        platform: Platform.OS,
        app_name: 'MyMateria',
      });

      if (__DEV__) {
        console.log('[PostHog] Initialized successfully');
      }
      
      setIsReady(true);
    } catch (error) {
      console.error('[PostHog] Initialization error:', error);
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
      }}
    >
      {children}
    </PostHogContext.Provider>
  );
}

// Outer provider component that wraps with PostHogProvider
export function PostHogProviderWrapper({ children }: PostHogProviderWrapperProps) {
  const apiKey = EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = EXPO_PUBLIC_POSTHOG_HOST;

  if (!apiKey || (__DEV__ && (apiKey as string) === 'YOUR_POSTHOG_API_KEY')) {
    console.warn('[PostHog] API key not configured. Set EXPO_PUBLIC_POSTHOG_API_KEY in your environment.');
    // Still render children so app works without analytics
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={apiKey}
      options={{
        host: host,
        captureAppLifecycleEvents: true,
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
