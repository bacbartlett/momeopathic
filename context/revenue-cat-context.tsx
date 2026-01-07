import { EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID, EXPO_PUBLIC_REVENUECAT_IOS_KEY } from '@/lib/env';
import { useUser } from '@clerk/clerk-expo';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// Entitlement identifier - this should match what you set up in RevenueCat dashboard
// Can be configured via environment variable or defaults to 'premium'
const ENTITLEMENT_ID = EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID;

interface RevenueCatContextType {
  /** Whether RevenueCat has been initialized */
  isReady: boolean;
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** Whether we're currently loading subscription status */
  isLoading: boolean;
  /** Current customer info from RevenueCat */
  customerInfo: CustomerInfo | null;
  /** Current offerings available for purchase */
  currentOffering: PurchasesOffering | null;
  /** Purchase a package */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore purchases */
  restorePurchases: () => Promise<boolean>;
  /** Refresh customer info */
  refreshCustomerInfo: () => Promise<void>;
  /** Error message if any */
  error: string | null;
}

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get Clerk user for identity sync
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  // Track current RevenueCat user ID to avoid unnecessary logIn calls
  const currentRevenueCatUserIdRef = useRef<string | null>(null);

  // Check if user has active subscription
  // First check for the specific entitlement ID, then fall back to checking if ANY entitlement is active
  const hasSpecificEntitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  console.log(customerInfo?.entitlements.active)
  const hasAnyEntitlement = Object.keys(customerInfo?.entitlements.active ?? {}).length > 0;
  const isSubscribed = hasSpecificEntitlement || hasAnyEntitlement;
  
  // Debug logging in development
  if (__DEV__ && customerInfo) {
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    console.log(customerInfo.entitlements.active)
    console.log('[RevenueCat] Has specific entitlement:', hasSpecificEntitlement);
    console.log('[RevenueCat] isSubscribed:', isSubscribed);
  }

  // Initialize RevenueCat
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        // Set log level for debugging (remove in production)
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        // Get platform-specific API key
        const apiKey = Platform.select({
          ios: EXPO_PUBLIC_REVENUECAT_IOS_KEY,
          android: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        });

        if (!apiKey) {
          throw new Error('RevenueCat API key not found for this platform');
        }

        // Configure RevenueCat
        await Purchases.configure({ apiKey });

        // Get initial customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        // Get offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setCurrentOffering(offerings.current);
        }

        setIsReady(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RevenueCat';
        console.error('RevenueCat initialization error:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };


    initRevenueCat();

    // Listen for customer info updates (may be undefined on unsupported platforms like web)
    let listenerCleanup: (() => void) | undefined;
    
    if (typeof Purchases.addCustomerInfoUpdateListener === 'function') {
      // The listener returns an EmitterSubscription with a remove() method
      const subscription = Purchases.addCustomerInfoUpdateListener((info) => {
        setCustomerInfo(info);
      }) as { remove: () => void } | undefined;
      
      if (subscription?.remove) {
        listenerCleanup = () => subscription.remove();
      }
    }

    return () => {
      listenerCleanup?.();
    };
  }, []);

  // Sync RevenueCat user identity with Clerk user ID
  useEffect(() => {
    // Wait for both RevenueCat and Clerk to be ready
    if (!isReady || !isClerkLoaded) {
      return;
    }

    const syncUserIdentity = async () => {
      try {
        const clerkUserId = user?.id ?? null;
        const currentRevenueCatUserId = currentRevenueCatUserIdRef.current;

        // User signed in: log in to RevenueCat with Clerk user ID
        if (clerkUserId && clerkUserId !== currentRevenueCatUserId) {
          console.log('[RevenueCat] Logging in user:', clerkUserId);
          setIsLoading(true);
          
          const { customerInfo: newInfo } = await Purchases.logIn(clerkUserId);
          currentRevenueCatUserIdRef.current = clerkUserId;
          setCustomerInfo(newInfo);
          
          // Refresh offerings after login
          const offerings = await Purchases.getOfferings();
          if (offerings.current) {
            setCurrentOffering(offerings.current);
          }
          
          setIsLoading(false);
          setError(null);
        }
        // User signed out: log out from RevenueCat
        else if (!clerkUserId && currentRevenueCatUserId !== null) {
          console.log('[RevenueCat] Logging out user');
          setIsLoading(true);
          
          const newInfo = await Purchases.logOut();
          currentRevenueCatUserIdRef.current = null;
          setCustomerInfo(newInfo);
          
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync user identity';
        console.error('[RevenueCat] Sync error:', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    syncUserIdentity();
  }, [isReady, isClerkLoaded, user?.id]);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[RevenueCat] Purchasing package:', pkg.identifier);
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      
      // Debug: Log what we got back
      if (__DEV__) {
        console.log('[RevenueCat] Purchase complete. Active entitlements:', Object.keys(newInfo.entitlements.active));
        console.log('[RevenueCat] All entitlements:', Object.keys(newInfo.entitlements.all));
      }
      
      setCustomerInfo(newInfo);
      
      // Check if purchase was successful - check specific entitlement or any entitlement
      const hasSpecificEntitlement = newInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
      const hasAnyEntitlement = Object.keys(newInfo.entitlements.active).length > 0;
      const hasEntitlement = hasSpecificEntitlement || hasAnyEntitlement;
      
      console.log('[RevenueCat] Purchase successful:', hasEntitlement);
      return hasEntitlement;
    } catch (err) {
      // Check if user cancelled
      if (err instanceof Error && 'userCancelled' in err && (err as { userCancelled?: boolean }).userCancelled) {
        // User cancelled, not an error
        return false;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('Purchase error:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[RevenueCat] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      
      // Debug: Log what we got back
      if (__DEV__) {
        console.log('[RevenueCat] Restore complete. Active entitlements:', Object.keys(info.entitlements.active));
      }
      
      setCustomerInfo(info);
      
      // Check if restore found entitlements - check specific or any
      const hasSpecificEntitlement = info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
      const hasAnyEntitlement = Object.keys(info.entitlements.active).length > 0;
      const hasEntitlement = hasSpecificEntitlement || hasAnyEntitlement;
      
      console.log('[RevenueCat] Restore found subscription:', hasEntitlement);
      return hasEntitlement;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      console.error('Restore error:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh subscription status';
      console.error('Refresh error:', errorMessage);
      setError(errorMessage);
    }
  }, []);

  return (
    <RevenueCatContext.Provider
      value={{
        isReady,
        isSubscribed,
        isLoading,
        customerInfo,
        currentOffering,
        purchasePackage,
        restorePurchases,
        refreshCustomerInfo,
        error,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
}

// Convenience hook for checking subscription status
export function useSubscription() {
  const { isSubscribed, isLoading, isReady } = useRevenueCat();
  return { isSubscribed, isLoading: isLoading || !isReady };
}
