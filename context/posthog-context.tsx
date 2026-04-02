// PostHog disabled - all analytics/tracking commented out
// import { EXPO_PUBLIC_POSTHOG_API_KEY, EXPO_PUBLIC_POSTHOG_HOST } from '@/lib/env';
// import { useQuery } from 'convex/react';
// import { api } from '../convex/_generated/api';
// import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, {
  // Component,
  createContext,
  // ErrorInfo,
  ReactNode,
  // useCallback,
  useContext,
  // useEffect,
  // useRef,
  // useState,
} from 'react';
// import { Text, TouchableOpacity, View } from 'react-native';

// const startupLog = (...args: Parameters<typeof console.log>) => {
//   if (__DEV__) {
//     console.log(...args);
//   }
// };

// startupLog('[STARTUP] posthog-context.tsx: Module loaded');

// React Native global error handler types
// declare const ErrorUtils: {
//   getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
//   setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
// };

// Event types for type-safe tracking
export type PostHogEvent =
  // App lifecycle
  | 'App Opened'
  // Auth
  | 'Sign In'
  | 'Sign In Failed'
  | 'Sign Out'
  | 'Password Reset'
  | 'Password Reset Failed'
  | 'Account Deleted'
  // Chat
  | 'Thread Created'
  | 'Thread Create Failed'
  | 'Thread Deleted'
  | 'Thread Switched'
  | 'Message Sent'
  | 'Message Send Failed'
  // Materia Medica
  | 'Materia Medica Opened'
  | 'Remedy Searched'
  | 'Remedy Viewed'
  | 'Remedy Shared'
  // Navigation
  | 'Screen Viewed'
  | 'Account Page Viewed'
  | 'Terms Viewed'
  | 'Privacy Policy Viewed'
  // Legal
  | 'Disclaimer Accepted'
  | 'Disclaimer Viewed'
  // Feedback
  | 'Feedback Prompt Shown'
  | 'Feedback Happy Selected'
  | 'Feedback Unhappy Selected'
  | 'Feedback Submitted'
  | 'Feedback Prompt Dismissed'
  | 'In-App Review Requested'
  // Onboarding
  | 'Onboarding Started'
  | 'Onboarding Completed';

// Properties type for events
export interface EventProperties {
  [key: string]: string | number | boolean | string[] | null;
}

// User profile properties
export interface UserProfileProperties {
  email?: string;
  name?: string;
  created?: string;
  platform?: string;
  app_version?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Helper to filter out undefined values from any object
// const filterUndefined = <T extends Record<string, unknown>>(obj: T): Record<string, string | number | boolean | string[] | null> => {
//   const filtered: Record<string, string | number | boolean | string[] | null> = {};
//   for (const [key, value] of Object.entries(obj)) {
//     if (value !== undefined) {
//       filtered[key] = value as string | number | boolean | string[] | null;
//     }
//   }
//   return filtered;
// };

interface PostHogContextType {
  /** Whether PostHog has been initialized */
  isReady: boolean;
  /** Track an event with optional properties */
  track: (event: PostHogEvent | string, properties?: EventProperties) => void;
  /** Set user profile properties */
  setUserProperties: (properties: UserProfileProperties) => void;
  /** Set user profile properties only if not already set */
  setUserPropertiesOnce: (properties: UserProfileProperties) => void;
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

const disabledPostHogContextValue: PostHogContextType = {
  isReady: true,
  track: () => {},
  setUserProperties: () => {},
  setUserPropertiesOnce: () => {},
  incrementUserProperty: () => {},
  setSuperProperties: () => {},
  timeEvent: () => {},
  reset: () => {},
  optOut: () => {},
  optIn: () => {},
  hasOptedOut: async () => true,
  captureException: () => {},
};

interface PostHogProviderWrapperProps {
  children: ReactNode;
}

// PostHog inner component - DISABLED
// function PostHogProviderInner({ children }: PostHogProviderWrapperProps) {
//   ... (entire PostHogProviderInner implementation commented out)
// }

// Outer provider component - DISABLED, always returns no-op context
export function PostHogProviderWrapper({ children }: PostHogProviderWrapperProps) {
  // PostHog disabled - always provide no-op context
  return (
    <PostHogContext.Provider value={disabledPostHogContextValue}>
      {children}
    </PostHogContext.Provider>
  );
  // Original PostHog initialization commented out:
  // const apiKey = EXPO_PUBLIC_POSTHOG_API_KEY;
  // const host = EXPO_PUBLIC_POSTHOG_HOST;
  // if (!apiKey || (__DEV__ && (apiKey as string) === 'YOUR_POSTHOG_API_KEY')) {
  //   return (
  //     <PostHogContext.Provider value={disabledPostHogContextValue}>
  //       {children}
  //     </PostHogContext.Provider>
  //   );
  // }
  // return (
  //   <PostHogProvider apiKey={apiKey} options={{ host, ... }}>
  //     <PostHogProviderInner>{children}</PostHogProviderInner>
  //   </PostHogProvider>
  // );
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


// ============================================
// PostHog Error Boundary for Crash Tracking - DISABLED
// ============================================

// interface PostHogErrorBoundaryProps {
//   children: ReactNode;
//   fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
// }
//
// interface ErrorBoundaryFallbackProps {
//   error: Error;
//   componentStack: string | null;
//   resetError: () => void;
// }
//
// interface PostHogErrorBoundaryState {
//   hasError: boolean;
//   error: Error | null;
//   componentStack: string | null;
// }
//
// export class PostHogErrorBoundary extends Component<PostHogErrorBoundaryProps, PostHogErrorBoundaryState> {
//   ... (entire PostHogErrorBoundary class commented out)
// }

// Stub export so existing imports don't break
export function PostHogErrorBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Component that sets up global error handling and reports unhandled errors to PostHog.
 * DISABLED - PostHog crash reporting commented out.
 */
export function PostHogCrashReporter({ children }: { children: ReactNode }) {
  // PostHog crash reporting disabled - just pass through children
  return <>{children}</>;
}
