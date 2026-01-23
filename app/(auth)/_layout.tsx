import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is signed in and trying to access auth routes, redirect to tabs
    if (isSignedIn) {
      try {
        router.replace('/(tabs)');
      } catch (error) {
        console.error('[AuthLayout] Navigation error:', error);
      }
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <ErrorBoundary context="AuthLayout">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>
    </ErrorBoundary>
  );
}

