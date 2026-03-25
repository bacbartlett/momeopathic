import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useConvexAuth } from 'convex/react';
import { ErrorBoundary } from '@/components/error-boundary';

export default function ChatLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // If user is not signed in, redirect to sign-in
    if (!isAuthenticated) {
      try {
        router.replace('/(auth)/sign-in');
      } catch (error) {
        console.error('[ChatLayout] Navigation error:', error);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render protected content until auth state is loaded
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary context="ChatLayout">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </ErrorBoundary>
  );
}
