import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';
import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from '@expo-google-fonts/quicksand';
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

// DisclaimerModal is now only used from account settings (see account.tsx)
// Onboarding is handled by OnboardingChat in the chat screen
import { FeedbackManager } from '@/components/feedback-modal';
import { SessionManager } from '@/components/session-manager';
import { Colors, Fonts, NavigationTheme, Typography } from '@/constants/theme';
import { ChatProvider } from '@/context/chat-context';
import { GuestProvider } from '@/context/guest-context';
import { PostHogCrashReporter, PostHogErrorBoundary, PostHogProviderWrapper, usePostHogAnalytics } from '@/context/posthog-context';
import { RevenueCatProvider } from '@/context/revenue-cat-context';
import { TrialProvider } from '@/context/trial-context';
import { api } from '@/convex/_generated/api';
import { tokenCache } from '@/lib/clerk-token-cache';
import * as SecureStore from 'expo-secure-store';
import { initializeDatabase } from '@/lib/db/init';
import { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_CONVEX_URL } from '@/lib/env';

const startupLog = (...args: Parameters<typeof console.log>) => {
  if (__DEV__) {
    console.log(...args);
  }
};

startupLog('[STARTUP] _layout.tsx: Module loaded');

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
startupLog('[STARTUP] Preventing splash screen auto-hide');
SplashScreen.preventAutoHideAsync();

// Initialize the Convex client
const convex = new ConvexReactClient(
  EXPO_PUBLIC_CONVEX_URL,
  {
    unsavedChangesWarning: false,
  }
);

/**
 * Component that automatically stores the user in the database when they sign in.
 * This should be rendered inside the ConvexProviderWithClerk.
 * We use useConvexAuth to wait for Convex to have the auth token (not just Clerk's isSignedIn).
 */
function StoreUserInDatabase({ children }: { children: React.ReactNode }) {
  startupLog('[STARTUP] StoreUserInDatabase: Rendering');
  // useConvexAuth tells us when Convex has received and validated the JWT token
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    startupLog('[STARTUP] StoreUserInDatabase: useEffect - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    // Only store user when Convex auth is ready and authenticated
    if (!isLoading && isAuthenticated) {
      // Check if there's a pending guest claim. If so, skip — claimGuestAccount
      // in GuestProvider will handle creating/upgrading the user record.
      // This prevents a race where store() creates a new user while
      // claimGuestAccount() is trying to upgrade the guest in-place.
      SecureStore.getItemAsync('guest_id').then((guestId) => {
        if (guestId) {
          startupLog('[STARTUP] StoreUserInDatabase: Skipping store — guest claim pending');
          return;
        }
        startupLog('[STARTUP] StoreUserInDatabase: Storing user in database');
        storeUser().catch((error) => {
          console.error('[STARTUP] StoreUserInDatabase: Failed to store user:', error);
        });
      }).catch((error) => {
        // SecureStore read failed — fall back to storing user to be safe
        console.error('[STARTUP] StoreUserInDatabase: SecureStore read failed, storing user anyway:', error);
        storeUser().catch((storeError) => {
          console.error('[STARTUP] StoreUserInDatabase: Failed to store user:', storeError);
        });
      });
    }
  }, [isLoading, isAuthenticated, storeUser]);

  startupLog('[STARTUP] StoreUserInDatabase: Returning children');
  return <>{children}</>;
}

/**
 * Component that tracks when the app is opened.
 * Must be rendered inside PostHogProviderWrapper.
 */
function AppOpenedTracker({ children }: { children: React.ReactNode }) {
  startupLog('[STARTUP] AppOpenedTracker: Rendering');
  const { track, isReady } = usePostHogAnalytics();
  startupLog('[STARTUP] AppOpenedTracker: PostHog isReady:', isReady);

  useEffect(() => {
    startupLog('[STARTUP] AppOpenedTracker: useEffect - isReady:', isReady);
    if (isReady) {
      startupLog('[STARTUP] AppOpenedTracker: Tracking App Opened event');
      track('App Opened');
    }
  }, [isReady, track]);

  startupLog('[STARTUP] AppOpenedTracker: Returning children');
  return <>{children}</>;
}

/**
 * Component that initializes the Materia Medica SQLite database.
 * This seeds the database on first launch with all remedy data.
 */
function MateriaMedicaInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      startupLog('[STARTUP] MateriaMedicaInitializer: Starting database initialization');
      try {
        const result = await initializeDatabase();
        if (result.success) {
          startupLog('[STARTUP] MateriaMedicaInitializer: Database initialized successfully', {
            isNewInstall: result.isNewInstall,
          });
        } else {
          console.error('[STARTUP] MateriaMedicaInitializer: Database initialization failed:', result.error);
        }
      } catch (error) {
        console.error('[STARTUP] MateriaMedicaInitializer: Unexpected error during initialization:', error);
      }
    };

    init();
  }, []);

  // Don't block rendering - database init runs in background
  // The materia medica screens will handle loading states if db isn't ready
  return <>{children}</>;
}

export default function RootLayout() {
  startupLog('[STARTUP] RootLayout: Component rendering');
  
  const [fontsLoaded] = useFonts({
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-SemiBold': Quicksand_600SemiBold,
    'Quicksand-Bold': Quicksand_700Bold,
    'Lato-Regular': Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
  });
  startupLog('[STARTUP] RootLayout: Fonts loaded:', fontsLoaded);

  useEffect(() => {
    startupLog('[STARTUP] RootLayout: useEffect - fontsLoaded:', fontsLoaded);
    if (fontsLoaded) {
      startupLog('[STARTUP] RootLayout: Hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.error('[STARTUP] RootLayout: Failed to hide splash screen:', error);
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    startupLog('[STARTUP] RootLayout: Fonts not loaded, returning null');
    return null;
  }

  const clerkPublishableKey = EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  startupLog('[STARTUP] RootLayout: Clerk key exists:', !!clerkPublishableKey);

  if (!clerkPublishableKey) {
    console.error('[STARTUP] RootLayout: Missing Clerk Publishable Key');
    throw new Error(
      'Missing Clerk Publishable Key'
    );
  }

  startupLog('[STARTUP] RootLayout: Rendering provider tree - ClerkProvider -> ClerkLoaded -> ConvexProviderWithClerk -> StoreUserInDatabase -> MateriaMedicaInitializer -> PostHogProviderWrapper -> PostHogCrashReporter -> PostHogErrorBoundary -> AppOpenedTracker -> RevenueCatProvider -> ThemeProvider -> ChatProvider -> Stack');
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <SessionManager />
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <GuestProvider>
          <StoreUserInDatabase>
            <MateriaMedicaInitializer>
              <PostHogProviderWrapper>
                <PostHogCrashReporter>
                  <PostHogErrorBoundary>
                    <AppOpenedTracker>
                      <RevenueCatProvider>
                        <TrialProvider>
                          <ThemeProvider value={NavigationTheme}>
                            <ChatProvider>
                              <Stack>
                              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                              <Stack.Screen
                                name="materia-medica"
                                options={{
                                  headerShown: false,
                                  animation: 'slide_from_right',
                                }}
                              />
                              <Stack.Screen
                                name="account"
                                options={{
                                  headerShown: false,
                                  presentation: 'modal',
                                  animation: 'slide_from_bottom',
                                }}
                              />
                              <Stack.Screen
                                name="terms"
                                options={{
                                  headerShown: false,
                                  presentation: 'modal',
                                  animation: 'slide_from_bottom',
                                }}
                              />
                              <Stack.Screen
                                name="privacy"
                                options={{
                                  headerShown: false,
                                  presentation: 'modal',
                                  animation: 'slide_from_bottom',
                                }}
                              />
                              <Stack.Screen
                                name="delete-account"
                                options={{
                                  headerShown: true,
                                  title: 'Delete Account',
                                  headerBackTitle: 'Back',
                                  presentation: 'modal',
                                  animation: 'slide_from_bottom',
                                  headerStyle: {
                                    backgroundColor: Colors.bgSurface,
                                  },
                                  headerTintColor: Colors.textPrimary,
                                  headerTitleStyle: {
                                    fontFamily: Fonts?.heading ?? 'System',
                                    fontSize: Typography.lg,
                                    fontWeight: Typography.semibold,
                                  },
                                }}
                              />
                              </Stack>
                              <StatusBar style="dark" />
                              <FeedbackManager />
                            </ChatProvider>
                          </ThemeProvider>
                        </TrialProvider>
                      </RevenueCatProvider>
                    </AppOpenedTracker>
                  </PostHogErrorBoundary>
                </PostHogCrashReporter>
              </PostHogProviderWrapper>
            </MateriaMedicaInitializer>
          </StoreUserInDatabase>
          </GuestProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
