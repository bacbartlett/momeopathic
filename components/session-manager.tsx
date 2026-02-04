/**
 * SessionManager - Ensures Clerk sessions remain active indefinitely
 *
 * This component:
 * 1. Monitors the authentication state
 * 2. Refreshes tokens before they expire
 * 3. Prevents automatic sign-outs due to session expiry
 */

import { useAuth, useUser } from '@clerk/clerk-expo';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function SessionManager() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const appState = useRef(AppState.currentState);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh token every 30 minutes to keep session alive
  // Clerk tokens typically expire after 1 hour, so this ensures they're always fresh
  const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

  const refreshToken = async () => {
    if (!isSignedIn) return;

    try {
      // Request a fresh token from Clerk
      // This will use the refresh token to get a new access token
      const token = await getToken();
      if (token) {
        console.log('[SessionManager] Token refreshed successfully');
      }
    } catch (error) {
      console.error('[SessionManager] Error refreshing token:', error);
    }
  };

  // Set up periodic token refresh
  useEffect(() => {
    if (!isSignedIn) {
      // Clear interval if user is not signed in
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    console.log('[SessionManager] Setting up token refresh interval');

    // Refresh immediately on mount
    refreshToken();

    // Set up periodic refresh
    refreshIntervalRef.current = setInterval(refreshToken, REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isSignedIn]);

  // Refresh token when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // App has come to the foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[SessionManager] App foregrounded, refreshing token');
        if (isSignedIn) {
          refreshToken();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isSignedIn]);

  // Log session info for debugging
  useEffect(() => {
    if (isSignedIn && user) {
      console.log('[SessionManager] User session active:', {
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
      });
    }
  }, [isSignedIn, user]);

  // This component doesn't render anything
  return null;
}
