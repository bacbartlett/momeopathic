import { useUser } from '@clerk/clerk-expo';
import { Mixpanel } from 'mixpanel-react-native';
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

// Create Mixpanel instance
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

// Lazy initialization - only create instance when token is available
let mixpanelInstance: Mixpanel | null = null;

function getMixpanelInstance(): Mixpanel | null {
  if (!MIXPANEL_TOKEN) {
    console.warn('[Mixpanel] Token not found. Set EXPO_PUBLIC_MIXPANEL_TOKEN in your environment.');
    return null;
  }
  
  if (!mixpanelInstance) {
    mixpanelInstance = new Mixpanel(MIXPANEL_TOKEN, true);
  }
  
  return mixpanelInstance;
}

// Event types for type-safe tracking
export type MixpanelEvent =
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
  [key: string]: string | number | boolean | string[] | null | undefined;
}

// User profile properties
export interface UserProfileProperties {
  $email?: string;
  $name?: string;
  $created?: string;
  subscription_status?: 'free' | 'premium';
  platform?: string;
  app_version?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface MixpanelContextType {
  /** Whether Mixpanel has been initialized */
  isReady: boolean;
  /** Track an event with optional properties */
  track: (event: MixpanelEvent | string, properties?: EventProperties) => void;
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

const MixpanelContext = createContext<MixpanelContextType | null>(null);

interface MixpanelProviderProps {
  children: ReactNode;
}

export function MixpanelProvider({ children }: MixpanelProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  // Track current identified user to avoid unnecessary identify calls
  const currentIdentifiedUserRef = useRef<string | null>(null);

  // Initialize Mixpanel
  useEffect(() => {
    const initMixpanel = async () => {
      const mixpanel = getMixpanelInstance();
      
      if (!mixpanel) {
        // Still mark as "ready" so the app works, just without tracking
        setIsReady(true);
        return;
      }

      try {
        await mixpanel.init();
        
        // Set default super properties
        mixpanel.registerSuperProperties({
          platform: Platform.OS,
          app_name: 'MyMateria',
        });

        if (__DEV__) {
          console.log('[Mixpanel] Initialized successfully');
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('[Mixpanel] Initialization error:', error);
        // Still mark as ready to not block the app
        setIsReady(true);
      }
    };

    initMixpanel();
  }, []);

  // Sync user identity with Clerk
  useEffect(() => {
    if (!isReady || !isClerkLoaded) {
      return;
    }

    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    const syncUserIdentity = async () => {
      try {
        const clerkUserId = user?.id ?? null;
        const currentIdentifiedUser = currentIdentifiedUserRef.current;

        // User signed in: identify to Mixpanel
        if (clerkUserId && clerkUserId !== currentIdentifiedUser) {
          if (__DEV__) {
            console.log('[Mixpanel] Identifying user:', clerkUserId);
          }
          
          mixpanel.identify(clerkUserId);
          currentIdentifiedUserRef.current = clerkUserId;

          // Set user profile properties
          const profileProps: UserProfileProperties = {
            platform: Platform.OS,
          };
          
          if (user?.emailAddresses?.[0]?.emailAddress) {
            profileProps.$email = user.emailAddresses[0].emailAddress;
          }
          
          if (user?.fullName) {
            profileProps.$name = user.fullName;
          } else if (user?.firstName) {
            profileProps.$name = user.firstName;
          }
          
          if (user?.createdAt) {
            profileProps.$created = new Date(user.createdAt).toISOString();
          }

          mixpanel.getPeople().set(profileProps);
        }
        // User signed out: reset Mixpanel
        else if (!clerkUserId && currentIdentifiedUser !== null) {
          if (__DEV__) {
            console.log('[Mixpanel] Resetting user identity');
          }
          
          mixpanel.reset();
          currentIdentifiedUserRef.current = null;
        }
      } catch (error) {
        console.error('[Mixpanel] Sync error:', error);
      }
    };

    syncUserIdentity();
  }, [isReady, isClerkLoaded, user?.id, user?.emailAddresses, user?.fullName, user?.firstName, user?.createdAt]);

  // Track an event
  const track = useCallback((event: MixpanelEvent | string, properties?: EventProperties) => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      if (properties) {
        mixpanel.track(event, properties);
      } else {
        mixpanel.track(event);
      }
      
      if (__DEV__) {
        console.log('[Mixpanel] Tracked:', event, properties ?? '');
      }
    } catch (error) {
      console.error('[Mixpanel] Track error:', error);
    }
  }, []);

  // Set user profile properties
  const setUserProperties = useCallback((properties: UserProfileProperties) => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.getPeople().set(properties);
      
      if (__DEV__) {
        console.log('[Mixpanel] Set user properties:', properties);
      }
    } catch (error) {
      console.error('[Mixpanel] Set user properties error:', error);
    }
  }, []);

  // Increment a numeric user property
  const incrementUserProperty = useCallback((property: string, by: number = 1) => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.getPeople().increment(property, by);
      
      if (__DEV__) {
        console.log('[Mixpanel] Incremented:', property, 'by', by);
      }
    } catch (error) {
      console.error('[Mixpanel] Increment error:', error);
    }
  }, []);

  // Register super properties (sent with every event)
  const setSuperProperties = useCallback((properties: EventProperties) => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.registerSuperProperties(properties);
      
      if (__DEV__) {
        console.log('[Mixpanel] Set super properties:', properties);
      }
    } catch (error) {
      console.error('[Mixpanel] Set super properties error:', error);
    }
  }, []);

  // Track time between events
  const timeEvent = useCallback((eventName: string) => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.timeEvent(eventName);
      
      if (__DEV__) {
        console.log('[Mixpanel] Started timing:', eventName);
      }
    } catch (error) {
      console.error('[Mixpanel] Time event error:', error);
    }
  }, []);

  // Reset user identity (on logout)
  const reset = useCallback(() => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.reset();
      currentIdentifiedUserRef.current = null;
      
      if (__DEV__) {
        console.log('[Mixpanel] Reset');
      }
    } catch (error) {
      console.error('[Mixpanel] Reset error:', error);
    }
  }, []);

  // Opt out of tracking
  const optOut = useCallback(() => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.optOutTracking();
      
      if (__DEV__) {
        console.log('[Mixpanel] Opted out of tracking');
      }
    } catch (error) {
      console.error('[Mixpanel] Opt out error:', error);
    }
  }, []);

  // Opt in to tracking
  const optIn = useCallback(() => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return;

    try {
      mixpanel.optInTracking();
      
      if (__DEV__) {
        console.log('[Mixpanel] Opted in to tracking');
      }
    } catch (error) {
      console.error('[Mixpanel] Opt in error:', error);
    }
  }, []);

  // Check if tracking is opted out
  const hasOptedOut = useCallback(async (): Promise<boolean> => {
    const mixpanel = getMixpanelInstance();
    if (!mixpanel) return true; // Default to opted out if no instance

    try {
      return await mixpanel.hasOptedOutTracking();
    } catch (error) {
      console.error('[Mixpanel] Check opt out error:', error);
      return false;
    }
  }, []);

  return (
    <MixpanelContext.Provider
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
    </MixpanelContext.Provider>
  );
}

export function useMixpanel() {
  const context = useContext(MixpanelContext);
  if (!context) {
    throw new Error('useMixpanel must be used within a MixpanelProvider');
  }
  return context;
}

// Convenience hook for just tracking events
export function useTrackEvent() {
  const { track } = useMixpanel();
  return track;
}
