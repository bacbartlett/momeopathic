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

import { DisclaimerManager } from '@/components/disclaimer-modal';
import { FeedbackManager } from '@/components/feedback-modal';
import { SessionManager } from '@/components/session-manager';
import { Colors, Fonts, NavigationTheme, Typography } from '@/constants/theme';
import { ChatProvider } from '@/context/chat-context';
import { GuestProvider } from '@/context/guest-context';
import { PostHogCrashReporter, PostHogErrorBoundary, PostHogProviderWrapper, usePostHogAnalytics } from '@/context/posthog-context';
import { RevenueCatProvider } from '@/context/revenue-cat-context';
import { api } from '@/convex/_generated/api';
import { tokenCache } from '@/lib/clerk-token-cache';
import { initializeDatabase } from '@/lib/db/init';
import { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_CONVEX_URL } from '@/lib/env';

// Startup logging - logs in both dev and production for debugging black screen issues
console.log('[STARTUP] _layout.tsx: Module loaded');

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
console.log('[STARTUP] Preventing splash screen auto-hide');
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
  console.log('[STARTUP] StoreUserInDatabase: Rendering');
  // useConvexAuth tells us when Convex has received and validated the JWT token
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    console.log('[STARTUP] StoreUserInDatabase: useEffect - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    // Only store user when Convex auth is ready and authenticated
    if (!isLoading && isAuthenticated) {
      console.log('[STARTUP] StoreUserInDatabase: Storing user in database');
      storeUser().catch((error) => {
        console.error('[STARTUP] StoreUserInDatabase: Failed to store user:', error);
      });
    }
  }, [isLoading, isAuthenticated, storeUser]);

  console.log('[STARTUP] StoreUserInDatabase: Returning children');
  return <>{children}</>;
}

/**
 * Component that tracks when the app is opened.
 * Must be rendered inside PostHogProviderWrapper.
 */
function AppOpenedTracker({ children }: { children: React.ReactNode }) {
  console.log('[STARTUP] AppOpenedTracker: Rendering');
  const { track, isReady } = usePostHogAnalytics();
  console.log('[STARTUP] AppOpenedTracker: PostHog isReady:', isReady);

  useEffect(() => {
    console.log('[STARTUP] AppOpenedTracker: useEffect - isReady:', isReady);
    if (isReady) {
      console.log('[STARTUP] AppOpenedTracker: Tracking App Opened event');
      track('App Opened');
    }
  }, [isReady, track]);

  console.log('[STARTUP] AppOpenedTracker: Returning children');
  return <>{children}</>;
}

/**
 * Component that initializes the Materia Medica SQLite database.
 * This seeds the database on first launch with all remedy data.
 */
function MateriaMedicaInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      console.log('[STARTUP] MateriaMedicaInitializer: Starting database initialization');
      try {
        const result = await initializeDatabase();
        if (result.success) {
          console.log('[STARTUP] MateriaMedicaInitializer: Database initialized successfully', {
            isNewInstall: result.isNewInstall,
          });
        } else {
          console.error('[STARTUP] MateriaMedicaInitializer: Database initialization failed:', result.error);
        }
      } catch (error) {
        console.error('[STARTUP] MateriaMedicaInitializer: Unexpected error during initialization:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // Don't block rendering - database init runs in background
  // The materia medica screens will handle loading states if db isn't ready
  return <>{children}</>;
}

export default function RootLayout() {
  console.log('[STARTUP] RootLayout: Component rendering');
  
  const [fontsLoaded] = useFonts({
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-SemiBold': Quicksand_600SemiBold,
    'Quicksand-Bold': Quicksand_700Bold,
    'Lato-Regular': Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
  });
  console.log('[STARTUP] RootLayout: Fonts loaded:', fontsLoaded);

  useEffect(() => {
    console.log('[STARTUP] RootLayout: useEffect - fontsLoaded:', fontsLoaded);
    if (fontsLoaded) {
      console.log('[STARTUP] RootLayout: Hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.error('[STARTUP] RootLayout: Failed to hide splash screen:', error);
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log('[STARTUP] RootLayout: Fonts not loaded, returning null');
    return null;
  }

  const clerkPublishableKey = EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  console.log('[STARTUP] RootLayout: Clerk key exists:', !!clerkPublishableKey);

  if (!clerkPublishableKey) {
    console.error('[STARTUP] RootLayout: Missing Clerk Publishable Key');
    throw new Error(
      'Missing Clerk Publishable Key'
    );
  }

  console.log('[STARTUP] RootLayout: Rendering provider tree - ClerkProvider -> ClerkLoaded -> ConvexProviderWithClerk -> StoreUserInDatabase -> MateriaMedicaInitializer -> PostHogProviderWrapper -> PostHogCrashReporter -> PostHogErrorBoundary -> AppOpenedTracker -> RevenueCatProvider -> ThemeProvider -> ChatProvider -> Stack');
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
                        <ThemeProvider value={NavigationTheme}>
                          <ChatProvider>
                            <Stack>
                              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
                            <DisclaimerManager />
                            <FeedbackManager />
                          </ChatProvider>
                        </ThemeProvider>
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
