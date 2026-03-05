import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '@/convex/_generated/api';
import { useGuest } from '@/context/guest-context';
import { useSubscription } from '@/context/revenue-cat-context';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

interface TrialContextType {
  isLoading: boolean;
  isFirstEverOpen: boolean;
  shouldShowTrialModal: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number | null;
  trialExpired: boolean;
  isSubscribed: boolean;
  canUseApp: boolean;
  startTrial: () => Promise<void>;
  recordFirstOpen: () => Promise<void>;
}

const TrialContext = createContext<TrialContextType | null>(null);

export function TrialProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { isGuest, isGuestLoading } = useGuest();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();

  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [suppressTrialModalForSession, setSuppressTrialModalForSession] = useState(false);
  const didRecordFirstOpenRef = useRef(false);

  const recordFirstAppOpen = useMutation(api.trial.recordFirstAppOpen);
  const startTrialMutation = useMutation(api.trial.startTrial);

  const shouldQueryTrial = isAuthenticated && !isGuest;

  const trialStatus = useQuery(
    api.trial.getTrialStatus,
    shouldQueryTrial ? { isSubscribed } : 'skip',
  );

  useQuery(
    api.trial.checkDeviceFingerprint,
    shouldQueryTrial && deviceFingerprint
      ? { deviceFingerprint }
      : 'skip',
  );

  const recordFirstOpen = useCallback(async () => {
    if (!shouldQueryTrial || didRecordFirstOpenRef.current) {
      return;
    }

    didRecordFirstOpenRef.current = true;
    setIsInitializing(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      setDeviceFingerprint(fingerprint);
      const result = await recordFirstAppOpen({ deviceFingerprint: fingerprint });
      if (result.userNotFound) {
        // User record doesn't exist yet (guest-to-auth conversion in progress).
        // Allow retry on next effect cycle. Keep isInitializing true so we
        // show loading instead of the lockout state.
        didRecordFirstOpenRef.current = false;
        return;
      }
      if (result.isFirstOpen) {
        setSuppressTrialModalForSession(true);
      }
      setIsInitializing(false);
    } catch (error) {
      console.error('Failed to record first app open:', error);
      didRecordFirstOpenRef.current = false;
      setIsInitializing(false);
    }
  }, [recordFirstAppOpen, shouldQueryTrial]);

  useEffect(() => {
    if (shouldQueryTrial) {
      recordFirstOpen().catch((error) => {
        console.error('Trial initialization failed:', error);
      });
    }
    // Re-run when trialStatus changes (e.g. user record is created by StoreUserInDatabase)
    // so that recordFirstOpen can retry if it previously got userNotFound.
  }, [recordFirstOpen, shouldQueryTrial, trialStatus]);

  useEffect(() => {
    if (!shouldQueryTrial) {
      didRecordFirstOpenRef.current = false;
      setDeviceFingerprint(null);
      setSuppressTrialModalForSession(false);
    }
  }, [shouldQueryTrial]);

  const startTrial = useCallback(async () => {
    await startTrialMutation({});
  }, [startTrialMutation]);

  const value = useMemo<TrialContextType>(() => {
    if (!shouldQueryTrial) {
      return {
        isLoading: isAuthLoading || isGuestLoading || isSubscriptionLoading,
        isFirstEverOpen: false,
        shouldShowTrialModal: false,
        isInTrial: false,
        trialDaysRemaining: null,
        trialExpired: false,
        isSubscribed,
        canUseApp: true,
        startTrial,
        recordFirstOpen,
      };
    }

    const status = trialStatus;
    const isLoading =
      isAuthLoading ||
      isGuestLoading ||
      isSubscriptionLoading ||
      isInitializing ||
      status === undefined;

    const isFirstEverOpen = status?.isFirstEverOpen ?? false;
    const isInTrial = status?.isInTrial ?? false;
    const trialDaysRemaining = status?.trialDaysRemaining ?? null;
    const trialExpired = isSubscribed ? false : (status?.trialExpired ?? false);
    const shouldShowTrialModal =
      isSubscribed
        ? false
        : (status?.shouldShowTrialModal ?? false) && !suppressTrialModalForSession;
    const canUseApp = isSubscribed || isInTrial || isFirstEverOpen;

    return {
      isLoading,
      isFirstEverOpen,
      shouldShowTrialModal,
      isInTrial,
      trialDaysRemaining,
      trialExpired,
      isSubscribed,
      canUseApp,
      startTrial,
      recordFirstOpen,
    };
  }, [
    isAuthLoading,
    isGuestLoading,
    isInitializing,
    isSubscribed,
    isSubscriptionLoading,
    recordFirstOpen,
    shouldQueryTrial,
    startTrial,
    suppressTrialModalForSession,
    trialStatus,
  ]);

  return <TrialContext.Provider value={value}>{children}</TrialContext.Provider>;
}

export function useTrialContext(): TrialContextType {
  const context = useContext(TrialContext);
  if (!context) {
    throw new Error('useTrialContext must be used within a TrialProvider');
  }
  return context;
}
