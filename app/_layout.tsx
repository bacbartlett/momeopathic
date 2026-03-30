import { ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

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
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { Platform } from 'react-native';

import { FeedbackManager } from '@/components/feedback-modal';
import { Colors, Fonts, NavigationTheme, Typography } from '@/constants/theme';
import { ChatProvider } from '@/context/chat-context';
import { PostHogCrashReporter, PostHogErrorBoundary, PostHogProviderWrapper, usePostHogAnalytics } from '@/context/posthog-context';
import { initializeDatabase } from '@/lib/db/init';
import { EXPO_PUBLIC_CONVEX_URL } from '@/lib/env';
import { registerServiceWorker } from '@/lib/register-sw';
import { getStorage } from '@/lib/storage';

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
    verbose: __DEV__,
  }
);

// Stale token cleanup removed — auth migration is complete.

// Platform-abstracted storage adapter for Convex Auth
// Web: localStorage, Native: expo-secure-store
const secureStorage = getStorage();

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
 * Component that tracks screen views when the user navigates.
 * Must be rendered inside PostHogProviderWrapper and a NavigationContainer.
 */
function ScreenTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { track, isReady } = usePostHogAnalytics();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !pathname || pathname === previousPathRef.current) return;
    previousPathRef.current = pathname;
    track('Screen Viewed', { screen_name: pathname });
  }, [isReady, pathname, track]);

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
          if (Platform.OS === 'web') {
            console.log('[STARTUP] MateriaMedicaInitializer: SQLite init failed on web, JSON fallback will be used');
          } else {
            console.error('[STARTUP] MateriaMedicaInitializer: Database initialization failed:', result.error);
          }
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          console.log('[STARTUP] MateriaMedicaInitializer: SQLite not available on web, using JSON fallback');
        } else {
          console.error('[STARTUP] MateriaMedicaInitializer: Unexpected error during initialization:', error);
        }
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

  // Register service worker on web for PWA support
  useEffect(() => {
    if (Platform.OS === 'web') {
      registerServiceWorker();
    }
  }, []);

  if (!fontsLoaded) {
    startupLog('[STARTUP] RootLayout: Fonts not loaded, returning null');
    return null;
  }

  startupLog('[STARTUP] RootLayout: Rendering provider tree - ConvexAuthProvider -> MateriaMedicaInitializer -> PostHogProviderWrapper -> PostHogCrashReporter -> PostHogErrorBoundary -> AppOpenedTracker -> ThemeProvider -> ChatProvider -> Stack');
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
        <MateriaMedicaInitializer>
          <PostHogProviderWrapper>
            <PostHogCrashReporter>
              <PostHogErrorBoundary>
                <AppOpenedTracker>
                  <ThemeProvider value={NavigationTheme}>
                    <ChatProvider>
                      <ScreenTracker>
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
                        name="ai-privacy"
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
                      </ScreenTracker>
                      <StatusBar style="dark" />
                      <FeedbackManager />
                    </ChatProvider>
                  </ThemeProvider>
                </AppOpenedTracker>
              </PostHogErrorBoundary>
            </PostHogCrashReporter>
          </PostHogProviderWrapper>
        </MateriaMedicaInitializer>
    </ConvexAuthProvider>
  );
}
