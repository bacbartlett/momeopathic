import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useConvexAuth } from 'convex/react';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (__DEV__) console.log('[AuthLayout] Auth state:', { isLoading, isAuthenticated });
    if (isLoading) return;

    // If user is signed in and trying to access auth routes, redirect to tabs
    if (isAuthenticated) {
      try {
        router.replace('/(tabs)');
      } catch (error) {
        console.error('[AuthLayout] Navigation error:', error);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <ErrorBoundary context="AuthLayout">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="join" />
      </Stack>
    </ErrorBoundary>
  );
}
