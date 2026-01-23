import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ErrorBoundary } from '@/components/error-boundary';

export default function ChatLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is not signed in, redirect to sign-in
    if (!isSignedIn) {
      try {
        router.replace('/(auth)/sign-in');
      } catch (error) {
        console.error('[ChatLayout] Navigation error:', error);
      }
    }
  }, [isSignedIn, isLoaded, router]);

  // Don't render protected content until auth state is loaded
  if (!isLoaded || !isSignedIn) {
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
