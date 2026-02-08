import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useGuest } from '@/context/guest-context';
import { ErrorBoundary } from '@/components/error-boundary';

export default function ChatLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isGuest, isGuestLoading } = useGuest();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || isGuestLoading) return;

    // If user is not signed in and not a guest, redirect to sign-in
    if (!isSignedIn && !isGuest) {
      try {
        router.replace('/(auth)/sign-in');
      } catch (error) {
        console.error('[ChatLayout] Navigation error:', error);
      }
    }
  }, [isSignedIn, isLoaded, isGuest, isGuestLoading, router]);

  // Don't render protected content until auth/guest state is loaded
  if (!isLoaded || isGuestLoading) {
    return null;
  }

  if (!isSignedIn && !isGuest) {
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
