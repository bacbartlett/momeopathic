import { api } from '@/convex/_generated/api';
import { usePostHogAnalytics } from '@/context/posthog-context';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useAction, useConvexAuth, useMutation } from 'convex/react';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const GUEST_ID_KEY = 'guest_id';

interface GuestContextType {
  guestId: string | null;
  isGuest: boolean;
  isGuestLoading: boolean;
  /** True when an authenticated user has a pending guest claim (guest→auth transition). */
  isClaimInProgress: boolean;
  clearGuestSession: () => Promise<void>;
}

const GuestContext = createContext<GuestContextType | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isGuestLoading, setIsGuestLoading] = useState(true);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createGuestUser = useMutation(api.users.createGuestUser);
  const claimGuestAccount = useAction(api.users.claimGuestAccount);
  const { track } = usePostHogAnalytics();

  useEffect(() => {
    // Wait for auth to settle
    if (isAuthLoading) return;

    // Signed in: try to recover any pending guest account claim.
    if (isAuthenticated) {
      const recoverGuestAccount = async () => {
        try {
          const existingId = await SecureStore.getItemAsync(GUEST_ID_KEY);
          if (!existingId) {
            setGuestId(null);
            return;
          }

          // Keep the id in memory so claim can retry on next app open if this fails.
          setGuestId(existingId);

          try {
            await claimGuestAccount({ guestId: existingId });
            await SecureStore.deleteItemAsync(GUEST_ID_KEY);
            setGuestId(null);
            track('Guest Account Claimed');
          } catch (error) {
            console.error('[GuestProvider] Failed to claim guest account, will retry on next app open:', error);
            // Clear guestId from memory so the app can proceed as a fresh authenticated user.
            // SecureStore still has the key, so the claim retries on next app open.
            setGuestId(null);
          }
        } catch (error) {
          console.error('[GuestProvider] Error recovering guest session:', error);
        } finally {
          setIsGuestLoading(false);
        }
      };

      recoverGuestAccount();
      return;
    }

    // Not authenticated - check for existing guest session or create one
    const initGuest = async () => {
      try {
        const existingId = await SecureStore.getItemAsync(GUEST_ID_KEY);
        if (existingId) {
          // Verify the guest user still exists by trying to use it
          setGuestId(existingId);
          setIsGuestLoading(false);
          return;
        }

        // Generate new guest ID and create user
        const newGuestId = Crypto.randomUUID();
        await SecureStore.setItemAsync(GUEST_ID_KEY, newGuestId);

        try {
          await createGuestUser({ guestId: newGuestId });
        } catch (error) {
          console.error('[GuestProvider] Failed to create guest user:', error);
          // Clean up on failure
          await SecureStore.deleteItemAsync(GUEST_ID_KEY);
          setIsGuestLoading(false);
          return;
        }

        setGuestId(newGuestId);
        track('Guest Session Started');
      } catch (error) {
        console.error('[GuestProvider] Error initializing guest session:', error);
      } finally {
        setIsGuestLoading(false);
      }
    };

    initGuest();
  }, [isAuthLoading, isAuthenticated, createGuestUser, claimGuestAccount, track]);

  const clearGuestSession = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(GUEST_ID_KEY);
    } catch (error) {
      console.error('[GuestProvider] Error clearing guest session:', error);
    }
    setGuestId(null);
  }, []);

  const isGuest = !isAuthenticated && guestId !== null;

  // Computed synchronously: true when authenticated but guestId still set (claim pending).
  // This is NOT a state variable — it derives from existing state in the SAME render,
  // so it's immediately true when auth flips, unlike setState which is async.
  // It becomes false when setGuestId(null) is called after claim completes (or fails).
  const isClaimInProgress = isAuthenticated && guestId !== null;

  return (
    <GuestContext.Provider
      value={{
        guestId,
        isGuest,
        isGuestLoading,
        isClaimInProgress,
        clearGuestSession,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}
