import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';

export default function ChatLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is not signed in, redirect to sign-in
    if (!isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [isSignedIn, isLoaded, router]);

  // Don't render protected content until auth state is loaded
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
