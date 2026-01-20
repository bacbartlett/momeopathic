import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
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
import { Colors, Fonts, NavigationTheme, Typography } from '@/constants/theme';
import { ChatProvider } from '@/context/chat-context';
import { PostHogProviderWrapper, usePostHogAnalytics } from '@/context/posthog-context';
import { RevenueCatProvider } from '@/context/revenue-cat-context';
import { api } from '@/convex/_generated/api';
import { tokenCache } from '@/lib/clerk-token-cache';
import { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_CONVEX_URL } from '@/lib/env';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
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
  // useConvexAuth tells us when Convex has received and validated the JWT token
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    // Only store user when Convex auth is ready and authenticated
    if (!isLoading && isAuthenticated) {
      storeUser().catch((error) => {
        console.error('Failed to store user in database:', error);
      });
    }
  }, [isLoading, isAuthenticated, storeUser]);

  return <>{children}</>;
}

/**
 * Component that tracks when the app is opened.
 * Must be rendered inside PostHogProviderWrapper.
 */
function AppOpenedTracker({ children }: { children: React.ReactNode }) {
  const { track, isReady } = usePostHogAnalytics();

  useEffect(() => {
    if (isReady) {
      track('App Opened');
    }
  }, [isReady, track]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-SemiBold': Quicksand_600SemiBold,
    'Quicksand-Bold': Quicksand_700Bold,
    'Lato-Regular': Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const clerkPublishableKey = EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    throw new Error(
      'Missing Clerk Publishable Key'
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <StoreUserInDatabase>
            <PostHogProviderWrapper>
              <AppOpenedTracker>
                <RevenueCatProvider>
                  <ThemeProvider value={NavigationTheme}>
                    <ChatProvider>
                      <Stack>
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
            </PostHogProviderWrapper>
          </StoreUserInDatabase>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
